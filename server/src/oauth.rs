use crate::{
    config::{get_config, GithubConfig},
    json::Error,
    routes::JsonResponse,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

static CLIENT: OnceLock<Client> = OnceLock::new();
static GITHUB_CONFIG: OnceLock<GithubConfig> = OnceLock::new();

#[derive(Serialize)]
struct GithubRequestUserTokenPayload {
    client_id: String,
    client_secret: String,
    code: String,
}

impl GithubRequestUserTokenPayload {
    fn from_code(code: String) -> Self {
        let github_config = GITHUB_CONFIG.get().expect("Didn't call `oauth::setup`");

        Self {
            client_id: github_config.client_id.clone(),
            client_secret: github_config.client_secret.clone(),
            code: code,
        }
    }
}

#[derive(Deserialize)]
struct GithubUserTokenPayload {
    access_token: String,
}

pub async fn setup() {
    let client = Client::builder()
        .user_agent(concat!(
            env!("CARGO_PKG_NAME"),
            "/",
            env!("CARGO_PKG_VERSION")
        ))
        .build()
        .unwrap();

    CLIENT
        .set(client)
        .expect("CLIENT.set called more than one time");

    GITHUB_CONFIG
        .set(get_config().github.clone())
        .expect("GITHUB_CONFIG.set called more than one time");
}

pub async fn get_github_token(code: String) -> Result<String, JsonResponse<Error>> {
    let client = CLIENT.get().expect("Didn't call `oauth::setup`");

    let resp = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json::<GithubRequestUserTokenPayload>(&GithubRequestUserTokenPayload::from_code(code))
        .send()
        .await
        .map_err(|e| format!("Reqwest Error: {}", e))?;

    if resp.status() != 200 {
        return Err("Github returned non 200 status code".to_string().into());
    }

    Ok(resp
        .json::<GithubUserTokenPayload>()
        .await
        .map_err(|e| format!("Deserialize Error: {}", e))?
        .access_token)
}
