use crate::get_pool;
use super::{Authorization, Error, JsonResponse};

use axum::{
    extract::Path,
    http::StatusCode,
};
use serde::Serialize;
use serde_repr::{Serialize_repr, Deserialize_repr};

#[derive(Copy, Clone, Debug, Deserialize_repr, Serialize_repr, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum PasteVisibility {
    Private = 0,
    Protected = 1,
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

#[derive(Debug, Serialize)]
pub struct Paste {
    pub id: String,
    pub author_id: Option<String>,
    pub author_name: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub visibility: PasteVisibility,
}

/// GET /pastes/:id
pub async fn get_paste(
    auth: Option<Authorization>,
    Path(id): Path<String>,
) -> Result<JsonResponse<Paste>, JsonResponse<Error>> {
    if id.starts_with("_") && auth.is_none() {
        return Err(JsonResponse(
            StatusCode::BAD_REQUEST,
            Error {
                message: "Authorization header required".to_string(),
            },
        ));
    }

    let paste = sqlx::query!(r#"
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
    "#, id)
        .fetch_optional(get_pool())
        .await?
        .ok_or_else(|| (
            StatusCode::NOT_FOUND,
            Error {
                message: "Paste not found".to_string(),
            }
        ))?;

    // Private
    if paste.visibility == 0 {

    }

    Ok(JsonResponse::ok(Paste {
        id: paste.id,
        author_id: paste.author_id,
        author_name: paste.username,
        name: paste.name,
        description: paste.description,
        visibility: PasteVisibility::from(paste.visibility as u8),
    }))
}

/// POST /pastes
///
/// # Limits
/// - 2 requests per 5 seconds (Scoped by IP)
/// - Maximum 16 files
/// - Each file has a maximum size of 2 MB
pub async fn post_paste(

)
