use argon2_async::{set_config, Config};
use base64::{encode_config, URL_SAFE_NO_PAD};
use ring::rand::{SecureRandom, SystemRandom};

use std::{
    sync::OnceLock,
    time::{SystemTime, UNIX_EPOCH},
    fs::read,
};

use crate::get_config;

pub static RNG: OnceLock<SystemRandom> = OnceLock::new();
pub const TOKEN_EPOCH: u128 = 1_577_836_800_000; // Jan 1 2020 @ 00:00:00 UTC

pub async fn configure_hasher() {
    let mut config = Config::new();

    let key = std::fs::read(get_config().auth.secret_key_path.clone())
        .expect("The secret key file does not exist")
        .into_boxed_slice();

    let key: &'static mut [u8] = Box::leak(key);
    
    config
        .set_secret_key(Some(key))
        .set_memory_cost(4096)
        .set_iterations(128);
    
    set_config(config).await
}

pub fn get_system_rng() -> &'static SystemRandom {
    RNG.get_or_init(SystemRandom::new)
}

pub fn generate_id<const N: usize>() -> String {
    let dest = &mut [0_u8; N];
    get_system_rng().fill(dest).expect("could not fill bytes");

    encode_config(dest, URL_SAFE_NO_PAD)
}

pub fn get_epoch_time() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("System clock is behind Unix Epoch")
        .as_millis()
        .saturating_sub(TOKEN_EPOCH)
}

// <id>.<epoch as string as b64>.<32 random bytes as b64>
pub fn generate_token(mut user_id: String) -> String {
    user_id.push('.');
    user_id.push_str(&*encode_config(
        get_epoch_time().to_string().as_bytes(),
        URL_SAFE_NO_PAD,
    ));
    user_id.push('.');
    user_id.push_str(&*{
        let dest = &mut [0_u8; 32];
        get_system_rng().fill(dest).expect("could not fill bytes");

        encode_config(dest, URL_SAFE_NO_PAD)
    });

    user_id
}
