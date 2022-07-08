use crate::routes::{Error, JsonResponse};

use axum::{
    body::Body,
    extract::ConnectInfo,
    handler::IntoService,
    http::{
        Request,
        StatusCode,
        header::FORWARDED,
    },
    middleware::{Next, from_fn},
    routing::Route,
    response::Response,
};
use forwarded_header_value::{ForwardedHeaderValue, Identifier};
use tower_layer::Layer;

use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    time::Duration,
};
use axum::handler::Handler;
use axum::response::IntoResponse;
use tokio::time::Instant;

#[derive(Clone, Debug, Hash)]
pub struct Bucket(pub u16, pub Instant);

async fn handle_ratelimit(
    req: Request<Body>,
    next: Next<Body>,
    bucket: &mut Bucket,
    rate: u16,
    per: u16,
) -> Result<Response, JsonResponse<Error>> {
    if bucket.1 > Instant::now() {
        let retry_after = bucket.1.duration_since(Instant::now()).as_millis() as f64 / 1000.;

        return Err(JsonResponse(
            StatusCode::TOO_MANY_REQUESTS,
            Error {
                message: format!("You are being ratelimited. Try again in {} seconds!", retry_after),
            }
        ))
    }

    bucket.0 = bucket.0.checked_sub(1).ok_or_else(|| {
        bucket.0 = rate;
        bucket.1 = Instant::now() + Duration::from_secs(per as u64);

        JsonResponse(
            StatusCode::TOO_MANY_REQUESTS,
            Error {
                message: format!("You are being ratelimited. Try again in {} seconds!", per),
            }
        )
    })?;

    Ok(next.run(req).await)
}

pub fn ratelimit<H, T>(rate: u16, per: u16) -> impl Layer<IntoService<H, T, Body>>
where
    H: Handler<T, Body>,
    T: 'static,
{
    let mut buckets = HashMap::<IpAddr, Bucket>::new();

    from_fn(async move |req, next: Next<Body>| -> Response {
        let addr = match get_ip(&req) {
            Some(ip) => ip,
            None => return JsonResponse(
                StatusCode::INTERNAL_SERVER_ERROR,
                Error {
                    message: "Could not resolve your IP address, which is needed for security and DoS protection purposes."
                        .to_string(),
                }
            ).into_response(),
        };

        let bucket = buckets.entry(addr).or_insert_with(|| Bucket(rate, Instant::now()));

        handle_ratelimit(req, next, bucket, rate, per).await.into_response()
    })
}

// Implmentation from https://github.com/imbolc/axum-client-ip/blob/main/src/lib.rs
fn get_ip(req: &Request<Body>) -> Option<IpAddr> {
    let headers = req.headers();

    headers
        .get("x-forwarded-for")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.split(',').find_map(|s| s.trim().parse::<IpAddr>().ok()))
        .or_else(|| headers
            .get("x-real-ip")
            .and_then(|hv| hv.to_str().ok())
            .and_then(|s| s.parse::<IpAddr>().ok())
        )
        .or_else(||
            headers.get_all(FORWARDED).iter().find_map(|hv| hv
                .to_str()
                .ok()
                .and_then(|s| ForwardedHeaderValue::from_forwarded(s).ok())
                .and_then(|f| f
                    .iter()
                    .filter_map(|fs| fs.forwarded_for.as_ref())
                    .find_map(|ident| match ident {
                        Identifier::SocketAddr(a) => Some(a.ip()),
                        Identifier::IpAddr(ip) => Some(*ip),
                        _ => None,
                    })
                )
            )
        )
        .or_else(|| req
            .extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|ConnectInfo(addr)| addr.ip()) 
        )
}
