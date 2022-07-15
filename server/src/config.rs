use serde::Deserialize;
use toml;

use std::{fs, sync::OnceLock};

pub static CONFIG: OnceLock<Config> = OnceLock::new();

#[derive(Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub github: GithubConfig,
}

#[derive(Clone, Deserialize)]
pub struct ServerConfig {
    #[serde(default = "default_port")]
    pub port: u16,
}

fn default_port() -> u16 {
    8081
}

#[derive(Debug, Clone, Deserialize)]
pub struct GithubConfig {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Clone, Deserialize)]
pub struct DatabaseConfig {
    #[serde(default = "default_host")]
    pub host: String,
    pub port: Option<u16>,
    #[serde(default = "default_username")]
    pub username: String,
    pub password: Option<String>,
    #[serde(default = "default_db")]
    pub database: String,
}

fn default_host() -> String {
    "localhost".to_string()
}

fn default_username() -> String {
    "postgres".to_string()
}

fn default_db() -> String {
    "turbine".to_string()
}

pub fn get_config() -> &'static Config {
    CONFIG.get_or_init(|| {
        toml::from_str(
            &*fs::read_to_string("config.toml")
                .expect("could not read from config.toml file, are you sure it exists?"),
        )
        .expect("could not parse config from config.toml file. you may be missing required fields.")
    })
}
