use crate::{
    config::get_config,
    json::Error,
    routes::JsonResponse,
};

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

static CLIENT: OnceLock<Client> = OnceLock::new();

#[derive(Serialize)]
struct GithubUserTokenPayload {
    client_id: String,
    client_secret: String,
    code: String,
}

impl GithubUserTokenPayload {
    fn from_code(code: String) -> Self {
        let github_config = &get_config().github;

        Self {
            client_id: github_config.client_id.clone(),
            client_secret: github_config.client_secret.clone(),
            code,
        }
    }
}

#[derive(Deserialize)]
struct GithubUserTokenData {
    access_token: String,
}

pub fn setup() {
    let client = Client::builder()
        .user_agent(concat!(
            env!("CARGO_PKG_NAME"),
            "/",
            env!("CARGO_PKG_VERSION")
        ))
        .build()
        .expect("Could not build HTTP client");

    CLIENT
        .set(client)
        .expect("CLIENT.set called more than one time");
}

pub async fn get_github_token(code: String) -> Result<String, JsonResponse<Error>> {
    let client = CLIENT.get().expect("Didn't call `oauth::setup`");

    let resp = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .json(&GithubUserTokenPayload::from_code(code))
        .send()
        .await?;

    if resp.status() != 200 {
        return Err("GitHub returned non-200 status code".to_string().into());
    }

    Ok(resp.json::<GithubUserTokenData>().await?.access_token)
}
