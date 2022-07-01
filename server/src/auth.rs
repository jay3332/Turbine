use argon2_async::{Config, set_config};
use base64::{encode_config, URL_SAFE_NO_PAD};
use ring::rand::{SystemRandom, SecureRandom};

use std::sync::OnceLock;

pub static RNG: OnceLock<SystemRandom> = OnceLock::new();

pub async fn configure_hasher() {
    set_config(Config::new()).await
}

pub fn get_system_rng() -> &'static SystemRandom {
    RNG.get_or_init(SystemRandom::new)
}

pub fn generate_id<const N: usize>() -> String {
    let dest = &mut [0_u8; N];
    get_system_rng().fill(dest).expect("could not fill bytes");

    encode_config(dest, URL_SAFE_NO_PAD)
}
