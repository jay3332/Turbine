use crate::routes::Error;

use axum::{
    http::StatusCode,
    Json,
    response::{IntoResponse, Response},
};
use serde::Serialize;

#[derive(Debug)]
pub struct JsonResponse<T: Serialize>(pub StatusCode, pub T);

impl<T: Serialize> JsonResponse<T> {
    pub fn ok(json: T) -> Self {
        Self(StatusCode::OK, json)
    }
}

impl<T: Serialize> IntoResponse for JsonResponse<T> {
    fn into_response(self) -> Response {
        (self.0, Json(self.1)).into_response()
    }
}

impl<T: Serialize> From<(u16, T)> for JsonResponse<T> {
    fn from((status, json): (u16, T)) -> Self {
        Self(
            StatusCode::from_u16(status.into()).expect(
                "error while converting into a status code, it's probably invalid.",
            ),
            json,
        )
    }
}

impl<T: Serialize> From<(StatusCode, T)> for JsonResponse<T> {
    fn from((status, json): (StatusCode, T)) -> Self {
        Self(status, json)
    }
}

impl From<sqlx::Error> for JsonResponse<Error> {
    fn from(err: sqlx::Error) -> Self {
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            Error {
                message: format!("Database threw an error: {:?}", err),
            },
        )
    }
}
