pub mod pastes;

pub use crate::json::JsonResponse;

use axum::{
    async_trait,
    body::Body,
    http::{header::AUTHORIZATION, StatusCode},
    extract::{FromRequest, RequestParts},
};
use serde::Serialize;

#[derive(Clone, PartialEq, Eq)]
pub enum Authorization {
    /// User token
    User(String),
    /// Paste password
    Paste(String),
}

#[derive(Clone, Serialize)]
pub struct Error {
    pub message: String,
}

#[async_trait]
impl FromRequest<Body> for Authorization {
    type Rejection = JsonResponse<Error>;

    async fn from_request(req: &mut RequestParts<Body>) -> Result<Self, Self::Rejection> {
        let auth_header = req
            .headers()
            .get(AUTHORIZATION)
            .ok_or_else(|| (
                400,
                Error {
                    message: "Missing 'Authorization' header".to_string(),
                }
            ))?;

        let content = auth_header.to_str().map_err(|_| (
            400,
            Error {
                message: "Authorization header is not valid UTF-8".to_string(),
            }
        ))?;

        let mut split = content.split_ascii_whitespace();

        let (ty, content) = split.next()
            .and_then(|a| split.next().map(|s| (a, s.to_string())))
            .ok_or_else(|| (
                400,
                Error {
                    message: "Invalid Authorization header. Expected something like 'User ...' or 'Paste ...'".to_string(),
                }
            ))?;

        Ok(match ty.to_ascii_lowercase().as_str() {
            "user" => Self::User(content),
            "paste" => Self::Paste(content),
            _ => return Err(JsonResponse(
                StatusCode::BAD_REQUEST,
                Error {
                    message: format!("Invalid Authorization type {:?}", ty),
                },
            )),
        })
    }
}
