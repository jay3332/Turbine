use crate::{get_pool, auth::{generate_id, generate_token}};
use super::{Authorization, Error, JsonResponse};


use argon2_async::{hash, verify};
use axum::{
    extract::{Json, Path},
    http::StatusCode,
    routing::{get, post},
    Router,
};
use check_if_email_exists::{CheckEmailInput, Reachable, check_email};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
pub struct User {
    pub id: String,
    pub username: String,
    // Email will only be returned if this is the current user
    pub email: Option<String>,
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

/// GET /users/:id
pub async fn get_user(
    auth: Option<Authorization>,
    Path(id): Path<String>,
) -> Result<JsonResponse<User>, JsonResponse<Error>> {
    let user = sqlx::query!("SELECT username, email FROM users WHERE id = $1", id)
        .fetch_optional(get_pool())
        .await?
        .ok_or_else(|| (
            StatusCode::NOT_FOUND,
            Error {
                message: "User with that ID not found".to_string(),
            },
        ))?;

    Ok(JsonResponse::ok(User {
        id: id.clone(),
        username: user.username,
        // my type-checker doesn't properly infer the type of .flatten, so we have to explicitly specify the type instead
        email: Option::flatten(auth.is_some_and(|user_id| id == user_id.0).then(|| user.email)),
    }))
}

/// POST /users
/// TODO: GitHub logins
///
/// # Limits
/// - 1 successful request per 20 seconds
/// - Username between 3 to 32 characters and unique
/// - Password between 6 and 128 characters
/// - Email must be unique and valid
pub async fn create_user(
    Json(UserPayload { username, email, password }): Json<UserPayload>,
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
            }
        ))
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
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error { message },
        ))
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
        ))
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

    Ok(JsonResponse::ok(UserCreateResponse { id }))
}

/// POST /login
///
/// # Limits
/// - 1 request per 20 seconds
/// - Supports either email or username
pub async fn login(
    Json(LoginPayload { username, email, password }): Json<LoginPayload>,
) -> Result<JsonResponse<LoginResponse>, JsonResponse<Error>> {
    let db = get_pool();

    // Boilerplate exists because of the nature of Rust and sqlx's ad-hoc structs
    let (id, hashed) = if let Some(username) = username {
        let record = sqlx::query!("SELECT id, password FROM users WHERE username = $1", username)
            .fetch_optional(db)
            .await?
            .ok_or_else(|| (
                StatusCode::NOT_FOUND,
                Error {
                    message: "Invalid credentials".to_string(),
                },
            ))?;

        (record.id, record.password)
    } else if let Some(email) = email {
        let record = sqlx::query!("SELECT id, password FROM users WHERE email = $1", email)
            .fetch_optional(db)
            .await?
            .ok_or_else(|| (
                StatusCode::NOT_FOUND,
                Error {
                    message: "Invalid credentials".to_string(),
                },
            ))?;

        (record.id, record.password)
    } else {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Must provide either email or username".to_string(),
            }
        ));
    };

    if !verify(password, hashed).await? {
        return Err(JsonResponse(
            StatusCode::UNAUTHORIZED,
            Error {
                message: "Invalid password".to_string(),
            }
        ))
    }

    let token = generate_token(id.clone());

    sqlx::query!("INSERT INTO tokens VALUES ($1, $2)", id, token)
        .execute(db)
        .await?;

    Ok(JsonResponse::ok(LoginResponse { id, token }))
}

pub fn router() -> Router {
    Router::new()
        .route("/users/:id", get(get_user))
        .route("/users", post(create_user))
        .route("/login", post(login))
}
