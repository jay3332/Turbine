use super::{Authorization, JsonResponse};
use crate::{
    auth::{generate_id, generate_token},
    get_pool,
    json::Error,
    oauth::{get_github_info, get_github_user},
    routes::pastes::{File, PastePreview, PasteVisibility},
    RatelimitLayer,
};

use argon2_async::{hash, verify};
use axum::{
    error_handling::HandleErrorLayer,
    extract::{Json, Path},
    handler::Handler,
    http::StatusCode,
    routing::{get, post, MethodFilter},
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
    pub avatar_url: Option<String>,
    pub github_id: Option<i32>,
}

#[derive(Clone, Deserialize)]
pub struct UserPayload {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Clone, Deserialize)]
pub struct GithubUserPayload {
    pub username: String,
    pub access_code: String,
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

#[derive(Clone, Deserialize)]
pub struct GithubLoginPayload {
    pub access_code: String,
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

#[derive(Clone, Serialize)]
pub struct PasteStarEntry {
    pub user_id: String,
    pub username: String,
    pub starred_at: i64,
}

#[derive(Clone, Deserialize)]
pub struct ValidationPayload {
    pub email: Option<String>,
    pub username: Option<String>,
}

/// GET /users/:id
pub async fn get_user(
    auth: Option<Authorization>,
    Path(id): Path<String>,
) -> Result<JsonResponse<User>, JsonResponse<Error>> {
    let user = sqlx::query!(
        "SELECT username, email, created_at, avatar_url, github_id FROM users WHERE id = $1",
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
        avatar_url: user.avatar_url,
        github_id: user.github_id,
    }))
}

/// GET /users/me
pub async fn get_self(
    Authorization(user_id): Authorization,
) -> Result<JsonResponse<User>, JsonResponse<Error>> {
    get_user(Some(Authorization(user_id.clone())), Path(user_id)).await
}

fn validate_username(username: &str) -> Result<(), JsonResponse<Error>> {
    if username.chars().count() < 3 || username.chars().count() > 32 {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Username must be between 3 and 32 characters long".to_string(),
            },
        ));
    }

    if !username
        .chars()
        .all(|c| matches!(c, 'a'..='z' | 'A'..='Z' | '0'..='9' | '_' | '-'))
    {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Username must only contain alphanumeric characters, _ and -".to_string(),
            },
        ));
    }

    if username.starts_with('-') || username.ends_with('-') {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Username must not start or end with -".to_string(),
            },
        ));
    }

    Ok(())
}

/// POST /users
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
    validate_username(&username)?;

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

/// POST /users/github
///
/// # Limits
/// - 5 requests per 30 seconds
/// - Username between 3 to 32 characters and unique
/// - GitHub email must be verified
pub async fn create_user_github(
    Json(GithubUserPayload {
        username,
        access_code,
    }): Json<GithubUserPayload>,
) -> Result<JsonResponse<UserCreateResponse>, JsonResponse<Error>> {
    validate_username(&username)?;

    let (email, github_data) = get_github_info(access_code).await?;
    let db = get_pool();

    if sqlx::query!(
        "SELECT id FROM users WHERE github_id = $1",
        github_data.id as i32
    )
    .fetch_optional(db)
    .await?
    .is_some()
    {
        return Err(JsonResponse(
            StatusCode::CONFLICT,
            Error {
                message:
                    "An account already exists that is associated with that GitHub account already"
                        .to_string(),
            },
        ));
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

    sqlx::query!(
        "
        INSERT INTO
            users (id, username, github_email, github_id, avatar_url)
        VALUES ($1, $2, $3, $4, $5)
        ",
        id,
        username,
        email,
        github_data.id as i32,
        github_data.avatar_url,
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

    let hashed = hashed.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Error {
                message: "You registered using a different method such as GitHub or Google. Please try using the method you registered with to login instead.".to_string(),
            },
        )
    })?;

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

/// POST /login/github
///
/// # Limits
/// - 1 request per 20 seconds
pub async fn login_github(
    Json(GithubLoginPayload { access_code }): Json<GithubLoginPayload>,
) -> Result<JsonResponse<LoginResponse>, JsonResponse<Error>> {
    let github_data = get_github_user(access_code).await?;

    let db = get_pool();
    let id = sqlx::query!(
        "SELECT id FROM users WHERE github_id = $1",
        github_data.id as i32
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Error {
                message: "User not found".to_string(),
            },
        )
    })?
    .id;

    let token = generate_token(id.clone());

    sqlx::query!("INSERT INTO tokens VALUES ($1, $2)", id, token)
        .execute(db)
        .await?;

    Ok(JsonResponse::ok(LoginResponse { id, token }))
}

/// DELETE /users/me
pub async fn delete_user(
    Authorization(user_id): Authorization,
) -> Result<StatusCode, JsonResponse<Error>> {
    let db = get_pool();

    sqlx::query!("DELETE FROM users WHERE id = $1", user_id)
        .execute(db)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

fn into_sanitized_paste(
    PastePreview {
        id,
        author_id,
        author_name,
        created_at,
        visibility,
        stars,
        views,
        ..
    }: PastePreview,
) -> PastePreview {
    PastePreview {
        id,
        author_id,
        author_name,
        created_at,
        visibility,
        stars,
        views,
        available: false,
        name: String::new(),
        description: None,
        first_file: File {
            filename: None,
            content: String::new(),
            language: None,
        },
    }
}

pub fn sanitize_paste(auth: &Option<Authorization>, preview: PastePreview) -> PastePreview {
    if let Some(Authorization(user_id)) = auth {
        if preview.visibility == PasteVisibility::Discoverable {
            return preview;
        } else if let Some(owner_id) = &preview.author_id {
            if user_id == owner_id {
                return preview;
            }
        }
    }

    into_sanitized_paste(preview)
}

/// GET /users/:user_id/stars
pub async fn list_user_stars(
    auth: Option<Authorization>,
    Path(user_id): Path<String>,
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
                available: true,
            })
            .map(|paste| sanitize_paste(&auth, paste))
            .collect(),
    ))
}

/// GET /users/me/stars
pub async fn list_self_stars(
    auth: Authorization,
) -> Result<JsonResponse<Vec<PastePreview>>, JsonResponse<Error>> {
    list_user_stars(Some(auth.clone()), Path(auth.0)).await
}

/// GET /pastes/:paste_id/stars
pub async fn get_paste_stars(
    Path(id): Path<String>,
) -> Result<JsonResponse<Vec<PasteStarEntry>>, JsonResponse<Error>> {
    let db = get_pool();

    let users = sqlx::query!(
        r#"
        SELECT
            user_id,
            (SELECT username FROM users WHERE users.id = user_id) AS "username!",
            created_at
        FROM
            stars
        WHERE
            paste_id = $1
    "#,
        id,
    )
    .fetch_all(db)
    .await?;

    Ok(JsonResponse::ok(
        users
            .into_iter()
            .map(|record| PasteStarEntry {
                user_id: record.user_id,
                username: record.username,
                starred_at: record.created_at.timestamp(),
            })
            .collect(),
    ))
}

/// PUT /pastes/:paste_id/stars
/// DELETE /pastes/:paste_id/stars
///
/// # Note
/// The received verb does not matter, this simply acts as a toggle.
pub async fn put_star(
    Authorization(user_id): Authorization,
    Path(paste_id): Path<String>,
) -> Result<JsonResponse<PutStarResponse>, JsonResponse<Error>> {
    let db = get_pool();
    let mut transaction = db.begin().await?;

    let mut initial_stars = sqlx::query!(
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
        initial_stars -= 1;
    } else {
        initial_stars += 1;
    }

    transaction.commit().await?;

    Ok(JsonResponse::ok(PutStarResponse {
        stars: initial_stars as u32,
        deleted: rows_affected == 0,
    }))
}

/// POST /users/validate
pub async fn validate(
    Json(ValidationPayload { email, username }): Json<ValidationPayload>,
) -> Result<StatusCode, JsonResponse<Error>> {
    let db = get_pool();

    if let Some(email) = email {
        if sqlx::query!("SELECT email FROM users WHERE email = $1", email)
            .fetch_optional(db)
            .await?
            .is_some()
        {
            return Err(JsonResponse(
                StatusCode::CONFLICT,
                Error {
                    message: "Email already in use".to_string(),
                },
            ));
        }
    }

    if let Some(username) = username {
        if sqlx::query!("SELECT username FROM users WHERE username = $1", username)
            .fetch_optional(db)
            .await?
            .is_some()
        {
            return Err(JsonResponse(
                StatusCode::CONFLICT,
                Error {
                    message: "Username already in use".to_string(),
                },
            ));
        }
    }

    Ok(StatusCode::NO_CONTENT)
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
        .route("/users/validate", post(validate.layer(ratelimit!(6, 6))))
        .route(
            "/users/me/stars",
            get(list_self_stars.layer(ratelimit!(5, 5))),
        )
        .route(
            "/users/me",
            get(get_self.layer(ratelimit!(5, 5))).delete(delete_user.layer(ratelimit!(2, 10))),
        )
        .route(
            "/users/github",
            post(create_user_github.layer(ratelimit!(5, 5))),
        )
        .route(
            "/users/:id/stars",
            get(list_user_stars.layer(ratelimit!(5, 5))),
        )
        .route("/users/:id", get(get_user.layer(ratelimit!(5, 5))))
        .route("/users", post(create_user.layer(ratelimit!(5, 30))))
        .route(
            "/pastes/:id/stars",
            get(get_paste_stars.layer(ratelimit!(5, 5))).on(
                MethodFilter::PUT | MethodFilter::DELETE,
                put_star.layer(ratelimit!(5, 7)),
            ),
        )
        .route("/login/github", post(login_github.layer(ratelimit!(2, 8))))
        .route("/login", post(login.layer(ratelimit!(2, 8))))
}
