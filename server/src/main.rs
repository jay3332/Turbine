#![feature(async_closure)]
#![feature(once_cell)]
#![feature(is_some_with)]
#![feature(try_blocks)]

pub mod auth;
pub mod cache;
pub mod config;
pub mod database;
pub mod json;
pub mod oauth;
pub mod ratelimit;
pub mod routes;

use axum::{http::StatusCode, routing::get, Router};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

pub use cache::{get_cache, get_cache_mut};
pub use config::get_config;
pub use database::get_pool;
pub use ratelimit::RatelimitLayer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    database::connect().await?;
    database::migrate().await;
    auth::configure_hasher().await;

    let router = Router::new()
        .route("/api", get(|| async { (StatusCode::OK, "Hello, world!") }))
        .nest("/api", routes::pastes::router())
        .nest("/api", routes::users::router())
        .route_layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([127, 0, 0, 1], get_config().server.port));
    let server = axum::Server::bind(&addr)
        .serve(router.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(async {
            tokio::signal::ctrl_c()
                .await
                .expect("Failed to listen for Ctrl+C");
        });

    server.await.expect("Failed to start HTTP server");

    Ok(())
}
