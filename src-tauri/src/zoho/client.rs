//! Thin HTTP wrapper around the Zoho CRM API with OAuth 2.0 refresh-token
//! flow. Access tokens are cached in memory (1h TTL with a 60s safety
//! margin) and refreshed on demand. On a 401 response the cached token is
//! discarded and the request retried once.

use std::sync::Arc;
use std::time::{Duration, Instant};

use reqwest::{Client, Method, Response, StatusCode};
use serde::Deserialize;
use serde_json::Value;
use tokio::sync::Mutex;

use super::config;
use super::error::ZohoError;

pub struct ZohoClient {
    http: Client,
    token_cache: Mutex<Option<CachedToken>>,
}

struct CachedToken {
    value: String,
    expires_at: Instant,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: Option<u64>,
}

impl ZohoClient {
    /// Build a client if secrets are configured; returns `None` otherwise so
    /// the app can gracefully fall back to mock data during dev.
    pub fn try_new() -> Option<Arc<Self>> {
        if !config::is_configured() {
            return None;
        }
        let http = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .ok()?;
        Some(Arc::new(Self {
            http,
            token_cache: Mutex::new(None),
        }))
    }

    pub async fn get<T: for<'de> Deserialize<'de>>(&self, path: &str) -> Result<T, ZohoError> {
        self.request_json(Method::GET, path, None).await
    }

    pub async fn put<T: for<'de> Deserialize<'de>>(
        &self,
        path: &str,
        body: Value,
    ) -> Result<T, ZohoError> {
        self.request_json(Method::PUT, path, Some(body)).await
    }

    async fn request_json<T: for<'de> Deserialize<'de>>(
        &self,
        method: Method,
        path: &str,
        body: Option<Value>,
    ) -> Result<T, ZohoError> {
        for attempt in 0..2 {
            let token = self.access_token().await?;
            let url = format!("{}{}", config::api_base(), path);
            let mut req = self
                .http
                .request(method.clone(), &url)
                .header("Authorization", format!("Zoho-oauthtoken {token}"));
            if let Some(body) = body.as_ref() {
                req = req.json(body);
            }

            let response = req.send().await?;
            if response.status() == StatusCode::UNAUTHORIZED && attempt == 0 {
                // Stale-token case: blow away the cache and try one more time.
                *self.token_cache.lock().await = None;
                continue;
            }
            return Self::parse_response(response).await;
        }
        unreachable!("loop bounded to 2 iterations")
    }

    async fn access_token(&self) -> Result<String, ZohoError> {
        let mut guard = self.token_cache.lock().await;
        if let Some(cached) = guard.as_ref() {
            if cached.expires_at > Instant::now() + Duration::from_secs(30) {
                return Ok(cached.value.clone());
            }
        }

        let client_id = config::client_id().ok_or(ZohoError::NotConfigured)?;
        let client_secret = config::client_secret().ok_or(ZohoError::NotConfigured)?;
        let refresh_token = config::refresh_token().ok_or(ZohoError::NotConfigured)?;

        let url = format!("{}/oauth/v2/token", config::accounts_url());
        let response = self
            .http
            .post(&url)
            .form(&[
                ("grant_type", "refresh_token"),
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("refresh_token", refresh_token),
            ])
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(ZohoError::AuthFailed(format!("{status} — {body}")));
        }

        let parsed: TokenResponse = response.json().await?;
        let ttl = parsed.expires_in.unwrap_or(3600).saturating_sub(60);
        let cached = CachedToken {
            value: parsed.access_token.clone(),
            expires_at: Instant::now() + Duration::from_secs(ttl),
        };
        *guard = Some(cached);
        Ok(parsed.access_token)
    }

    async fn parse_response<T: for<'de> Deserialize<'de>>(
        response: Response,
    ) -> Result<T, ZohoError> {
        let status = response.status();
        if status.is_success() {
            return response
                .json::<T>()
                .await
                .map_err(|e| ZohoError::Parse(e.to_string()));
        }
        let body = response.text().await.unwrap_or_default();
        if status == StatusCode::NOT_FOUND {
            return Err(ZohoError::NotFound(body));
        }
        Err(ZohoError::ApiError {
            status: status.as_u16(),
            body,
        })
    }
}
