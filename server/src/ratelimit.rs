use axum::body::Body;
use axum::extract::{FromRequest, RequestParts, ConnectInfo};
use axum::http::Request;
use axum::http::header::FORWARDED;
use axum::middleware::{FromFnLayer, from_fn};
use axum::routing::Route;
use axum::response::Response;
use axum::async_trait;
use axum::response::IntoResponse;
use forwarded_header_value::{ForwardedHeaderValue, Identifier};
use tower_layer::Layer;

use std::net::{IpAddr, SocketAddr};

use crate::json::JsonResponse;
use crate::routes::Error;

struct RatelimitState {
    total: u8,
    per: u8,
}


async fn _ratelimit(req: Request<Body>, next: Request<Body>, state: RatelimitState) -> impl IntoResponse {

}

fn ratelimit<F: Layer<Route<Body>>>(total: u8, per: u8) -> F {
    from_fn(move |req, next| {
        _ratelimit(req, next, RatelimitState {  })
    })
}

// Implmentation from https://github.com/imbolc/axum-client-ip/blob/main/src/lib.rs
fn get_ip(req: &Request<Body>) -> Option<IpAddr> {
    let headers = req.headers();

    let ip = headers
        .get("x-forwarded-for")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.split(',').find_map(|s| s.trim().parse::<IpAddr>().ok()))
        .or_else(|| headers
            .get("x-real-ip")
            .and_then(|hv| hv.to_str().ok())
            .and_then(|s| s.parse::<IpAddr>().ok())
        )
        .or_else(||
            headers.get_all(FORWARDED).iter().find_map(|hv| {
                hv.to_str()
                    .ok()
                    .and_then(|s| ForwardedHeaderValue::from_forwarded(s).ok())
                    .and_then(|f| {
                        f.iter()
                            .filter_map(|fs| fs.forwarded_for.as_ref())
                            .find_map(|ff| match ff {
                                Identifier::SocketAddr(a) => Some(a.ip()),
                                Identifier::IpAddr(ip) => Some(*ip),
                                _ => None,
                            })
                    })
            }) 
        )
        .or_else(||
            req.extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|ConnectInfo(addr)| addr.ip()) 
        );
}
