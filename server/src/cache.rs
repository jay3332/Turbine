use deadpool_redis::{Config, Pool, Runtime};
use redis::AsyncCommands;
use std::sync::OnceLock;

use crate::{get_config, get_pool, json::Error, routes::JsonResponse};

static POOL: OnceLock<Pool> = OnceLock::new();

pub async fn setup() -> Result<(), Box<dyn std::error::Error>> {
    let cfg = Config::from_url(get_config().redis.url.clone());
    let pool = cfg.create_pool(Some(Runtime::Tokio1))?;

    // Test connection
    let _ = redis::cmd("PING")
        .query_async::<_, ()>(&mut pool.get().await?)
        .await?;

    POOL.set(pool)
        .unwrap_or_else(|_| panic!("POOL.set called more than once")); // redis::aio::Connection doesn't implement Debug

    Ok(())
}

pub async fn resolve_token(token: &str) -> Result<String, JsonResponse<Error>> {
    if let Some(id) = POOL
        .get()
        .expect("Didn't call `cache::setup`")
        .get()
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

    let _ = POOL
        .get()
        .expect("Didn't call `cache::setup`")
        .get()
        .await?
        .hset::<_, _, _, ()>("turbine_token_to_id", token, &id)
        .await?;

    Ok(id)
}
