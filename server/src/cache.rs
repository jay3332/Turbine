//! A low-effort and simple hashmap-based cache. I plan to use Redis for this in the future.

use crate::{json::JsonResponse, routes::Error, get_pool};
use std::{collections::HashMap, sync::OnceLock};

pub static mut CACHE: OnceLock<Cache> = OnceLock::new();

#[derive(Debug, Default)]
pub struct Cache {
    // token -> id
    pub tokens: HashMap<String, String>,
}

impl Cache {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn resolve_token(&mut self, token: String) -> Result<String, JsonResponse<Error>> {
        if let Some(id) = self.tokens.get(&token) {
            return Ok(id.clone());
        }

        Ok(
            sqlx::query!("SELECT user_id FROM tokens WHERE token = $1", token)
                .fetch_optional(get_pool())
                .await?
                .ok_or_else(|| (
                    404,
                    Error {
                        message: "Invalid authorization token".to_string(),
                    },
                ))?
                .user_id
        )
    }
}

pub fn get_cache() -> &'static Cache {
    unsafe { CACHE.get_or_init(Cache::default) }
}

pub fn get_cache_mut() -> &'static mut Cache {
    get_cache(); // Ensure cache is initialized first

    unsafe { CACHE.get_mut().unwrap() }
}
