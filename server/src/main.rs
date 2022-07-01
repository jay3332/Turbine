#![feature(once_cell)]

pub mod config;
pub mod database;
pub mod json;
pub mod routes;

pub use config::get_config;
pub use database::get_pool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    database::connect().await?;
    database::migrate().await;

    Ok(())
}
