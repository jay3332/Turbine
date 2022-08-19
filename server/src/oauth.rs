use crate::{config::get_config, json::Error, routes::JsonResponse};

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

#[derive(Deserialize)]
struct GithubEmailData {
    email: String,
    primary: bool,
    verified: bool,
}

#[derive(Deserialize)]
pub struct GithubUserData {
    pub id: u32,
    pub avatar_url: String,
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

pub async fn get_github_user(code: String) -> Result<GithubUserData, JsonResponse<Error>> {
    let token = get_github_token(code).await?;

    // SAFETY: we have already done .expect when calling get_github_token
    let client = unsafe { CLIENT.get().unwrap_unchecked() };

    let data = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?
        .json::<GithubUserData>()
        .await?;

    Ok(data)
}

pub async fn get_github_info(
    code: String,
) -> Result<(String, GithubUserData), JsonResponse<Error>> {
    let token = get_github_token(code).await?;

    // SAFETY: we have already done .expect when calling get_github_token
    let client = unsafe { CLIENT.get().unwrap_unchecked() };

    let email = client
        .get("https://api.github.com/user/emails")
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/vnd.github+json")
        .send()
        .await?
        .json::<Vec<GithubEmailData>>()
        .await?
        .into_iter()
        .find_map(|email| (email.primary && email.verified).then_some(email.email))
        .ok_or_else(|| {
            (
                400,
                Error {
                    message: "GitHub account does not have a primary or verified email".to_string(),
                },
            )
        })?;

    let data = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?
        .json::<GithubUserData>()
        .await?;

    Ok((email, data))
}
