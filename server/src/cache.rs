use redis::{AsyncCommands, Client};
use std::sync::OnceLock;

use crate::{get_config, get_pool, json::Error, routes::JsonResponse};

static CLIENT: OnceLock<Client> = OnceLock::new();

pub async fn setup() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::open(get_config().redis.url.clone())?;
    // Test connection
    let _ = redis::cmd("PING")
        .query_async::<_, ()>(&mut client.get_tokio_connection().await?)
        .await?;

    CLIENT
        .set(client)
        .expect("CLIENT.set called more than once");

    Ok(())
}

pub async fn resolve_token(token: &str) -> Result<String, JsonResponse<Error>> {
    if let Some(id) = CLIENT
        .get()
        .expect("Didn't call `cache::setup`")
        .get_tokio_connection()
        .await?
        .hget::<_, _, Option<String>>("turbine_token_to_id", token)
        .await?
    {
        return Ok(id);
    }

    let id = sqlx::query!("SELECT user_id FROM tokens WHERE token = $1", token)
        .fetch_optional(get_pool())
        .await?
        .ok_or_else(|| {
            (
                404,
                Error {
                    message: "Invalid authorization token".to_string(),
                },
            )
        })?
        .user_id;

    let _ = CLIENT
        .get()
        .expect("Didn't call `cache::setup`")
        .get_tokio_connection()
        .await?
        .hset::<_, _, _, ()>("turbine_token_to_id", token, &id)
        .await?;

    Ok(id)
}
