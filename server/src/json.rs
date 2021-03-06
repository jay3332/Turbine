use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct Error {
    pub message: String,
}

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
            StatusCode::from_u16(status.into())
                .expect("error while converting into a status code, it's probably invalid."),
            json,
        )
    }
}

impl From<String> for JsonResponse<Error> {
    fn from(message: String) -> Self {
        Self(StatusCode::INTERNAL_SERVER_ERROR, Error { message })
    }
}

impl<T: Serialize> From<(StatusCode, T)> for JsonResponse<T> {
    fn from((status, json): (StatusCode, T)) -> Self {
        Self(status, json)
    }
}

impl From<redis::RedisError> for JsonResponse<Error> {
    fn from(err: redis::RedisError) -> Self {
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            Error {
                message: format!("Redis Error: {:?}", err),
            },
        )
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

impl From<deadpool_redis::PoolError> for JsonResponse<Error> {
    fn from(err: deadpool_redis::PoolError) -> Self {
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            Error {
                message: format!("Redis Pool Error: {:?}", err),
            },
        )
    }
}

impl From<argon2_async::Error> for JsonResponse<Error> {
    fn from(err: argon2_async::Error) -> Self {
        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            Error {
                message: format!("Could not hash password: {:?}", err),
            },
        )
    }
}

impl From<reqwest::Error> for JsonResponse<Error> {
    fn from(err: reqwest::Error) -> Self {
        let url = if let Some(url) = err.url() {
            url.to_string()
        } else {
            "<unknown>".to_string()
        };

        Self(
            StatusCode::INTERNAL_SERVER_ERROR,
            Error {
                message: format!("Error while requesting to {}: {:?}", url, err),
            },
        )
    }
}
