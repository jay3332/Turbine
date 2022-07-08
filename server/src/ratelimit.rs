use crate::routes::{Error, JsonResponse};

use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{header::FORWARDED, Request, StatusCode},
    response::{IntoResponse, Response},
};
use forwarded_header_value::{ForwardedHeaderValue, Identifier};
use tower::{Layer, Service};

use std::{
    collections::HashMap,
    future::Future,
    net::{IpAddr, SocketAddr},
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};
use tokio::time::Instant;

#[derive(Clone, Debug, Hash)]
pub struct Bucket(pub u16, pub Instant);

#[derive(Debug)]
pub struct Ratelimit<S> {
    inner: S,
    rate: u16,
    per: u16,
    buckets: HashMap<IpAddr, Bucket>,
}

impl<S> Ratelimit<S> {
    pub fn new(service: S, rate: u16, per: u16) -> Self {
        Self {
            inner: service,
            rate,
            per,
            buckets: HashMap::new(),
        }
    }

    fn handle_ratelimit(&mut self, ip: IpAddr) -> Result<(), JsonResponse<Error>> {
        let bucket = self
            .buckets
            .entry(ip)
            .or_insert_with(|| Bucket(self.rate, Instant::now()));

        if bucket.1 > Instant::now() {
            let retry_after = bucket.1.duration_since(Instant::now()).as_millis() as f64 / 1000.;

            return Err(JsonResponse(
                StatusCode::TOO_MANY_REQUESTS,
                Error {
                    message: format!(
                        "You are being ratelimited. Try again in {} seconds",
                        retry_after
                    ),
                },
            ));
        }

        bucket.0 -= 1;

        if bucket.0 == 0 {
            bucket.0 = self.rate;
            bucket.1 = Instant::now() + Duration::from_secs(self.per as u64);
        }

        Ok(())
    }
}

impl<S> Service<Request<Body>> for Ratelimit<S>
where
    S: Service<Request<Body>, Response = Response> + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future =
        Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send + 'static>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let ip = match get_ip(&req) {
            Some(ip) => ip,
            None => {
                return Box::pin(async {
                    Ok(JsonResponse(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Error {
                            message: "Could not resolve your IP address, which is needed for security and DoS protection purposes."
                                .to_string(),
                        }
                    ).into_response())
                })
            }
        };

        match self.handle_ratelimit(ip) {
            Ok(_) => Box::pin(self.inner.call(req)),
            Err(res) => Box::pin(async { Ok(res.into_response()) }),
        }
    }
}

#[derive(Copy, Clone, Debug)]
pub struct RatelimitLayer(pub u16, pub u16);

impl<S> Layer<S> for RatelimitLayer {
    type Service = Ratelimit<S>;

    fn layer(&self, inner: S) -> Self::Service {
        Ratelimit::new(inner, self.0, self.1)
    }
}

// Implmentation from https://github.com/imbolc/axum-client-ip/blob/main/src/lib.rs
fn get_ip(req: &Request<Body>) -> Option<IpAddr> {
    let headers = req.headers();

    headers
        .get("x-forwarded-for")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.split(',').find_map(|s| s.trim().parse::<IpAddr>().ok()))
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|hv| hv.to_str().ok())
                .and_then(|s| s.parse::<IpAddr>().ok())
        })
        .or_else(|| {
            headers.get_all(FORWARDED).iter().find_map(|hv| {
                hv.to_str()
                    .ok()
                    .and_then(|s| ForwardedHeaderValue::from_forwarded(s).ok())
                    .and_then(|f| {
                        f.iter()
                            .filter_map(|fs| fs.forwarded_for.as_ref())
                            .find_map(|ident| match ident {
                                Identifier::SocketAddr(a) => Some(a.ip()),
                                Identifier::IpAddr(ip) => Some(*ip),
                                _ => None,
                            })
                    })
            })
        })
        .or_else(|| {
            req.extensions()
                .get::<ConnectInfo<SocketAddr>>()
                .map(|ConnectInfo(addr)| addr.ip())
        })
}
