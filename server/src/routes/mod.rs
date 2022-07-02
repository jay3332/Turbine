pub mod pastes;
pub mod users;

pub use crate::{json::JsonResponse, get_cache_mut};

use axum::{
    async_trait,
    body::Body,
    http::header::AUTHORIZATION,
    extract::{FromRequest, RequestParts},
};
use serde::Serialize;

#[derive(Clone, PartialEq, Eq)]
pub struct Authorization(pub String);

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

        Ok(Self(get_cache_mut().resolve_token(content.to_string()).await?))
    }
}
