use super::{Authorization, Error, JsonResponse};
use crate::{auth::generate_id, get_pool, RatelimitLayer};

use argon2_async::{hash, verify};
use axum::{
    error_handling::HandleErrorLayer,
    extract::{Json, Path, Query},
    handler::Handler,
    http::StatusCode,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use tower::{buffer::BufferLayer, ServiceBuilder};

#[derive(Copy, Clone, Debug, Default, Deserialize_repr, Serialize_repr, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum PasteVisibility {
    Private = 0,
    Protected = 1,
    #[default]
    Unlisted = 2,
    Discoverable = 3,
}

impl From<u8> for PasteVisibility {
    fn from(n: u8) -> Self {
        match n {
            0 => Self::Private,
            1 => Self::Protected,
            2 => Self::Unlisted,
            3 => Self::Discoverable,
            _ => panic!("invalid visibility"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct File {
    filename: Option<String>,
    content: String,
}

#[derive(Debug, Serialize)]
pub struct Paste {
    pub id: String,
    pub author_id: Option<String>,
    pub author_name: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub visibility: PasteVisibility,
    pub files: Vec<File>,
}

#[derive(Debug, Deserialize)]
pub struct PastePayload {
    pub name: Option<String>,
    pub description: Option<String>,
    #[serde(default)]
    pub visibility: PasteVisibility,
    pub password: Option<String>,
    pub files: Vec<File>,
}

#[derive(Debug, Serialize)]
pub struct PasteResponse {
    pub id: String,
}

#[derive(Deserialize)]
pub struct GetPasteQuery {
    password: Option<String>,
}

/// GET /pastes/:id
pub async fn get_paste(
    auth: Option<Authorization>,
    Path(id): Path<String>,
    Query(query): Query<GetPasteQuery>,
) -> Result<JsonResponse<Paste>, JsonResponse<Error>> {
    let db = get_pool();

    let paste = sqlx::query!(
        r#"
        SELECT
            pastes.*,
            u.username AS "username?"
        FROM
            pastes
        LEFT JOIN LATERAL (
            SELECT username FROM users WHERE users.id = pastes.author_id
        ) AS u ON username IS NOT NULL
        WHERE
            id = $1
    "#,
        id
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Error {
                message: "Paste not found".to_string(),
            },
        )
    })?;

    if paste.visibility == 0 && auth.is_none() {
        return Err(JsonResponse(
            StatusCode::UNAUTHORIZED,
            Error {
                message: "Authorization header required".to_string(),
            },
        ));
    }

    let authorized = if let (Some(Authorization(u)), Some(author_id)) = (&auth, &paste.author_id) {
        u == author_id
    } else {
        paste.visibility >= 2
    };

    if paste.visibility == 1 && !authorized {
        if let Some(password) = query.password {
            if !verify(
                password,
                paste.password.clone().ok_or_else(|| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Error {
                            message: "Accessed a malformed paste! This shouldn't happen."
                                .to_string(),
                        },
                    )
                })?,
            )
            .await?
            {
                return Err(JsonResponse(
                    StatusCode::UNAUTHORIZED,
                    Error {
                        message: "Incorrect password".to_string(),
                    },
                ));
            }
        } else {
            return Err(JsonResponse(
                StatusCode::UNAUTHORIZED,
                Error {
                    message: r#"Please provide a "password" query parameter containing this paste's password."#.to_string(),
                },
            ));
        }
    }

    let files = sqlx::query!(
        "SELECT * FROM files WHERE paste_id = $1 ORDER BY idx ASC",
        id
    )
    .fetch_all(db)
    .await?
    .into_iter()
    .map(|record| File {
        filename: record.filename,
        content: record.content,
    })
    .collect::<Vec<_>>();

    Ok(JsonResponse::ok(Paste {
        id,
        author_id: paste.author_id,
        author_name: paste.username,
        name: paste.name,
        description: paste.description,
        visibility: PasteVisibility::from(paste.visibility as u8),
        files,
    }))
}

/// POST /pastes
///
/// # Limits
/// - 2 requests per 5 seconds (Scoped by IP)
/// - Maximum 16 files
/// - Each file has a maximum size of 2 MB
pub async fn post_paste(
    auth: Option<Authorization>,
    Json(payload): Json<PastePayload>,
) -> Result<JsonResponse<PasteResponse>, JsonResponse<Error>> {
    if payload.visibility == PasteVisibility::Private && auth.is_none() {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Authorization header required for private pastes".to_string(),
            },
        ));
    }

    if payload.visibility == PasteVisibility::Protected {
        if let Some(password) = &payload.password {
            if password.chars().count() < 1 {
                return Err(JsonResponse(
                    StatusCode::BAD_REQUEST,
                    Error {
                        message: "Password field must be at least 1 character long".to_string(),
                    },
                ));
            }
        } else {
            return Err(JsonResponse(
                StatusCode::BAD_REQUEST,
                Error {
                    message: "Missing password field in a paste with protected visibility"
                        .to_string(),
                },
            ));
        }
    }

    if payload.files.len() > 16 {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: format!(
                    "Received {} files, which is greater than the maximum of 16",
                    payload.files.len(),
                ),
            },
        ));
    }

    for (i, File { filename, content }) in payload.files.iter().enumerate() {
        if let Some(filename) = filename {
            if filename.chars().count() > 64 {
                return Err(JsonResponse(
                    StatusCode::BAD_REQUEST,
                    Error {
                        message: format!(
                            "The filename of the file at index {} (0-indexed) has a length of {}, which surpasses the maximum of 64",
                            i,
                            filename.chars().count(),
                        )
                    }
                ));
            }
        }

        if content.len() > 2 * 1024 * 1024 {
            return Err(JsonResponse(
                StatusCode::PAYLOAD_TOO_LARGE,
                Error {
                    message: format!(
                        "The file at index {} (0-indexed) has a size of {} bytes, which surpasses the maximum of 2 MiB",
                        i,
                        content.len(),
                    ),
                }
            ));
        }
    }

    let id = generate_id::<12>();
    let db = get_pool();

    let password = if let Some(password) = payload.password {
        Some(hash(password).await?)
    } else {
        None
    };

    sqlx::query!(
        "INSERT INTO pastes VALUES ($1, $2, $3, $4, $5, $6)",
        id,
        auth.map(|auth| auth.0),
        payload.name.unwrap_or_else(|| "Untitled Paste".to_string()),
        payload.description,
        payload.visibility as i16,
        password,
    )
    .execute(db)
    .await?;

    sqlx::query(
        "
        INSERT INTO files
        SELECT $1, out.*
        FROM UNNEST($2, $3, $4)
        AS out(idx, filename, content)
    ",
    )
    .bind(id.clone())
    .bind((0..payload.files.len() as i16).collect::<Vec<_>>())
    .bind(
        payload
            .files
            .iter()
            .map(|file| file.filename.clone())
            .collect::<Vec<_>>(),
    )
    .bind(
        payload
            .files
            .into_iter()
            .map(|file| file.content)
            .collect::<Vec<_>>(),
    )
    .execute(db)
    .await?;

    Ok(JsonResponse::ok(PasteResponse { id }))
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
        .route("/pastes/:id", get(get_paste.layer(ratelimit!(10, 15))))
        .route("/pastes", post(post_paste.layer(ratelimit!(2, 5))))
}
