use crate::get_config;

use sqlx::{
    postgres::{PgConnectOptions, PgPoolOptions},
    Pool, Postgres,
};

use std::{error::Error, sync::OnceLock};

pub static POOL: OnceLock<Pool<Postgres>> = OnceLock::new();

pub async fn connect() -> Result<(), Box<dyn Error>> {
    let cfg = &get_config().database;

    let connect_options = PgConnectOptions::new()
        .database(cfg.database.as_str())
        .username(cfg.username.as_str())
        .host(cfg.host.as_str());

    let connect_options = if let Some(port) = cfg.port {
        connect_options.port(port)
    } else {
        connect_options
    };

    let connect_options = if let Some(password) = &cfg.password {
        connect_options.password(password.as_str())
    } else {
        connect_options
    };

    let pool = PgPoolOptions::new().connect_with(connect_options).await?;
    POOL.set(pool)
        .unwrap_or_else(|pool| panic!("attempted to initialize more than once with {:?}", pool,));

    Ok(())
}

pub fn get_pool() -> &'static Pool<Postgres> {
    POOL.get()
        .expect("pool not initialized, please run database::connect() first")
}

pub async fn migrate() {
    sqlx::migrate!()
        .run(get_pool())
        .await
        .expect("failed to run database migrations");
}
