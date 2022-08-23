use super::{Authorization, JsonResponse};
use crate::{auth::generate_id, get_pool, json::Error, RatelimitLayer};

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
    pub filename: Option<String>,
    pub content: String,
    pub language: Option<String>,
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
    pub created_at: i64,
    pub views: u32,
    pub stars: u32,
    pub starred: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct PastePreview {
    pub id: Option<String>,
    pub author_id: Option<String>,
    pub author_name: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub visibility: PasteVisibility,
    pub first_file: Option<File>,
    pub created_at: i64,
    pub views: u32,
    pub stars: u32,
    pub available: bool,
    pub starred_at: Option<i64>,
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
            u.username AS "username?",
            (SELECT COUNT(*) FROM stars WHERE paste_id = pastes.id) AS stars,
            EXISTS(SELECT 1 FROM stars WHERE paste_id = pastes.id AND user_id = $2) AS starred
        FROM
            pastes
        LEFT JOIN LATERAL (
            SELECT username FROM users WHERE users.id = pastes.author_id
        ) AS u ON username IS NOT NULL
        WHERE
            id = $1
    "#,
        id,
        auth.as_ref().map(|Authorization(a)| a)
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

    let views = sqlx::query!(
        "UPDATE pastes SET views = views + 1 WHERE id = $1 RETURNING views",
        id,
    )
    .fetch_one(db)
    .await?
    .views;

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
        language: record.language,
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
        created_at: paste.created_at.timestamp(),
        stars: paste.stars.unwrap_or(0) as u32,
        starred: auth.and_then(|_| paste.starred),
        views: views as u32,
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

    if payload.files.is_empty() {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "No files provided".to_string(),
            },
        ));
    } else if payload.files.len() > 16 {
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

    for (
        i,
        File {
            filename,
            content,
            language,
        },
    ) in payload.files.iter().enumerate()
    {
        for (name, entity, max_len) in [("filename", filename, 64), ("language", language, 32)] {
            if let Some(entity) = entity {
                if entity.chars().count() > max_len {
                    return Err(JsonResponse(
                        StatusCode::BAD_REQUEST,
                        Error {
                            message: format!(
                                "The {} of the file at index {} (0-indexed) has a length of {}, which surpasses the maximum of {}",
                                name,
                                i,
                                entity.chars().count(),
                                max_len,
                            )
                        }
                    ));
                }
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
    let mut transaction = db.begin().await?;

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
    .execute(&mut transaction)
    .await?;

    let (filenames, (content, languages)) = payload
        .files
        .into_iter()
        .map(|file| (file.filename, (file.content, file.language)))
        .unzip::<_, _, Vec<_>, (Vec<_>, Vec<_>)>();

    sqlx::query(
        "
        INSERT INTO files
        SELECT $1, out.*
        FROM UNNEST($2, $3, $4, $5)
        AS out(idx, filename, content, languages)
    ",
    )
    .bind(id.clone())
    .bind((0..filenames.len() as i16).collect::<Vec<_>>())
    .bind(filenames)
    .bind(content)
    .bind(languages)
    .execute(&mut transaction)
    .await?;

    transaction.commit().await?;

    Ok(JsonResponse(StatusCode::CREATED, PasteResponse { id }))
}

/// DELETE /pastes/:id
pub async fn delete_paste(
    Authorization(user_id): Authorization,
    Path(id): Path<String>,
) -> Result<StatusCode, JsonResponse<Error>> {
    let db = get_pool();

    let author_id = sqlx::query!("SELECT author_id FROM pastes WHERE id = $1", id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| {
            JsonResponse(
                StatusCode::NOT_FOUND,
                Error {
                    message: "Paste not found".to_string(),
                },
            )
        })?
        .author_id;

    if author_id != Some(user_id) {
        return Err(JsonResponse(
            StatusCode::FORBIDDEN,
            Error {
                message: "You do not have permission to delete this paste".to_string(),
            },
        ));
    }

    sqlx::query!("DELETE FROM pastes WHERE id = $1", id)
        .execute(db)
        .await?;

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
        .route(
            "/pastes/:id",
            get(get_paste.layer(ratelimit!(10, 15))).delete(delete_paste.layer(ratelimit!(3, 6))),
        )
        .route("/pastes", post(post_paste.layer(ratelimit!(2, 5))))
}
