use super::{Authorization, Error, JsonResponse};
use crate::{
    auth::{generate_id, generate_token},
    get_pool,
    routes::pastes::{File, PastePreview, PasteVisibility},
    RatelimitLayer,
};

use argon2_async::{hash, verify};
use axum::{
    error_handling::HandleErrorLayer,
    extract::{Json, Path},
    handler::Handler,
    http::StatusCode,
    routing::{get, post, put},
    Router,
};
use check_if_email_exists::{check_email, CheckEmailInput, Reachable};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tower::{buffer::BufferLayer, ServiceBuilder};

pub type Timestamp = DateTime<Utc>;

#[derive(Clone, Serialize)]
pub struct User {
    pub id: String,
    pub username: String,
    // Email will only be returned if this is the current user
    pub email: Option<String>,
    pub created_at: i64,
}

#[derive(Clone, Deserialize)]
pub struct UserPayload {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Clone, Serialize)]
pub struct UserCreateResponse {
    pub id: String,
}

#[derive(Clone, Deserialize)]
pub struct LoginPayload {
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: String,
}

#[derive(Clone, Serialize)]
pub struct LoginResponse {
    pub id: String,
    pub token: String,
}

#[derive(Clone, Serialize)]
pub struct PutStarResponse {
    pub stars: u32,
    pub deleted: bool,
}

/// GET /users/:id
pub async fn get_user(
    auth: Option<Authorization>,
    Path(id): Path<String>,
) -> Result<JsonResponse<User>, JsonResponse<Error>> {
    let user = sqlx::query!(
        "SELECT username, email, created_at FROM users WHERE id = $1",
        id
    )
    .fetch_optional(get_pool())
    .await?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Error {
                message: "User with that ID not found".to_string(),
            },
        )
    })?;

    Ok(JsonResponse::ok(User {
        id: id.clone(),
        username: user.username,
        // my type-checker doesn't properly infer the type of .flatten, so we have to explicitly specify the type instead
        email: Option::flatten(
            auth.is_some_and(|user_id| id == user_id.0)
                .then(|| user.email),
        ),
        created_at: user.created_at.timestamp(),
    }))
}

/// POST /users
/// TODO: GitHub logins
///
/// # Limits
/// - 5 requests per 30 seconds
/// - Username between 3 to 32 characters and unique
/// - Password between 6 and 128 characters
/// - Email must be unique and valid
pub async fn create_user(
    Json(UserPayload {
        username,
        email,
        password,
    }): Json<UserPayload>,
) -> Result<JsonResponse<UserCreateResponse>, JsonResponse<Error>> {
    if username.chars().count() < 3 || username.chars().count() > 32 {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Username must be between 3 and 32 characters long".to_string(),
            },
        ));
    }

    if password.chars().count() < 6 || password.chars().count() > 128 {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Password must be between 6 and 128 characters long".to_string(),
            },
        ));
    }

    let db = get_pool();

    if sqlx::query!("SELECT id FROM users WHERE email = $1", email)
        .fetch_optional(db)
        .await?
        .is_some()
    {
        return Err(JsonResponse(
            StatusCode::CONFLICT,
            Error {
                message: "Email is already taken".to_string(),
            },
        ));
    }

    let email_input = CheckEmailInput::new(vec![email.clone()]);
    let output = check_email(&email_input).await.into_iter().next().unwrap();

    let message = match output.is_reachable {
        Reachable::Unknown if output.syntax.domain == "outlook.com" => None,
        Reachable::Unknown => Some("Unable to verify if the provided email address is valid, please try using a different one."),
        Reachable::Invalid => Some("Invalid email address"),
        Reachable::Risky => Some(
            "Unsupported email address. This likely happens because you're \
            using a temp-email service or your email has a full inbox."
        ),
        Reachable::Safe => None,
    };

    if let Some(message) = message.map(ToString::to_string) {
        return Err(JsonResponse(StatusCode::BAD_REQUEST, Error { message }));
    }

    if sqlx::query!("SELECT id FROM users WHERE username = $1", username)
        .fetch_optional(db)
        .await?
        .is_some()
    {
        return Err(JsonResponse(
            StatusCode::CONFLICT,
            Error {
                message: "Username already taken".to_string(),
            },
        ));
    }

    let id = generate_id::<12>();
    let password = hash(password).await?;

    sqlx::query!(
        "INSERT INTO users VALUES ($1, $2, $3, $4)",
        id,
        username,
        password,
        email,
    )
    .execute(db)
    .await?;

    Ok(JsonResponse(StatusCode::CREATED, UserCreateResponse { id }))
}

/// POST /login
///
/// # Limits
/// - 1 request per 20 seconds
/// - Supports either email or username
pub async fn login(
    Json(LoginPayload {
        username,
        email,
        password,
    }): Json<LoginPayload>,
) -> Result<JsonResponse<LoginResponse>, JsonResponse<Error>> {
    let db = get_pool();

    // Boilerplate exists because of the nature of Rust and sqlx's ad-hoc structs
    let (id, hashed) = if let Some(username) = username {
        let record = sqlx::query!(
            "SELECT id, password FROM users WHERE username = $1",
            username
        )
        .fetch_optional(db)
        .await?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Error {
                    message: "Invalid credentials".to_string(),
                },
            )
        })?;

        (record.id, record.password)
    } else if let Some(email) = email {
        let record = sqlx::query!("SELECT id, password FROM users WHERE email = $1", email)
            .fetch_optional(db)
            .await?
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Error {
                        message: "Invalid credentials".to_string(),
                    },
                )
            })?;

        (record.id, record.password)
    } else {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Must provide either email or username".to_string(),
            },
        ));
    };

    if !verify(password, hashed).await? {
        return Err(JsonResponse(
            StatusCode::UNAUTHORIZED,
            Error {
                message: "Invalid password".to_string(),
            },
        ));
    }

    let token = generate_token(id.clone());

    sqlx::query!("INSERT INTO tokens VALUES ($1, $2)", id, token)
        .execute(db)
        .await?;

    Ok(JsonResponse::ok(LoginResponse { id, token }))
}

pub async fn list_stars(
    Authorization(user_id): Authorization,
) -> Result<JsonResponse<Vec<PastePreview>>, JsonResponse<Error>> {
    let db = get_pool();

    let stars = sqlx::query!(
        r#"
        SELECT
            pastes.*,
            u.username AS "username?",
            f.filename AS "filename?",
            f.content AS "content!",
            f.language AS "language?",
            (SELECT COUNT(*) FROM stars WHERE paste_id = pastes.id) AS stars
        FROM
            pastes
        LEFT JOIN LATERAL (
            SELECT username FROM users WHERE users.id = pastes.author_id
        ) AS u ON username IS NOT NULL
        LEFT JOIN LATERAL (
            SELECT * FROM files WHERE files.paste_id = pastes.id AND files.idx = 0
        ) AS f ON true
        WHERE
            id
        IN (SELECT paste_id FROM stars WHERE user_id = $1)
        "#,
        user_id,
    )
    .fetch_all(db)
    .await?;

    Ok(JsonResponse::ok(
        stars
            .into_iter()
            .map(|paste| PastePreview {
                id: paste.id,
                name: paste.name,
                description: paste.description,
                author_id: paste.author_id,
                author_name: paste.username,
                created_at: paste.created_at.timestamp(),
                visibility: PasteVisibility::from(paste.visibility as u8),
                stars: paste.stars.unwrap_or(0) as u32,
                views: paste.views as u32,
                first_file: File {
                    filename: paste.filename,
                    content: paste.content,
                    language: paste.language,
                },
            })
            .collect(),
    ))
}

pub async fn put_star(
    Authorization(user_id): Authorization,
    Path(paste_id): Path<String>,
) -> Result<JsonResponse<PutStarResponse>, JsonResponse<Error>> {
    let db = get_pool();
    let mut transaction = db.begin().await?;

    let initial_stars = sqlx::query!(
        "SELECT COUNT(*) AS count FROM stars WHERE paste_id = $1",
        paste_id,
    )
    .fetch_optional(&mut transaction)
    .await?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Error {
                message: "Paste not found".to_string(),
            },
        )
    })?
    .count
    .unwrap_or(0);

    let rows_affected = sqlx::query!(
        "INSERT INTO stars VALUES ($1, $2) ON CONFLICT DO NOTHING",
        user_id,
        paste_id,
    )
    .execute(&mut transaction)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        let deleted = sqlx::query!(
            "DELETE FROM stars WHERE user_id = $1 AND paste_id = $2",
            user_id,
            paste_id,
        )
        .execute(&mut transaction)
        .await?
        .rows_affected();

        assert_eq!(deleted, 1);
    }

    Ok(JsonResponse::ok(PutStarResponse {
        stars: initial_stars as u32,
        deleted: rows_affected == 0,
    }))
}

macro_rules! ratelimit {
    ($rate:expr, $per:expr) => {{
        ServiceBuilder::new()
            .layer(HandleErrorLayer::new(|e| async move {
                JsonResponse(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Error {
                        message: format!("Internal error: {}", e),
                    },
                )
            }))
            .layer(BufferLayer::new(1024))
            .layer(RatelimitLayer($rate, $per))
    }};
}

pub fn router() -> Router {
    Router::new()
        .route("/users/:id", get(get_user.layer(ratelimit!(5, 5))))
        .route("/users", post(create_user.layer(ratelimit!(5, 30))))
        .route("/stars/:id", put(put_star.layer(ratelimit!(5, 7))))
        .route("/stars", get(list_stars.layer(ratelimit!(5, 5))))
        .route("/login", post(login.layer(ratelimit!(2, 8))))
}
