use thiserror::Error;

#[derive(Error, Debug)]
pub enum ZohoError {
    #[error("Zoho niet geconfigureerd (CLIENT_ID/SECRET/REFRESH_TOKEN ontbreken)")]
    NotConfigured,

    #[error("Netwerkfout: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Token refresh mislukt: {0}")]
    AuthFailed(String),

    #[error("Zoho API fout ({status}): {body}")]
    ApiError { status: u16, body: String },

    #[error("JSON parse fout: {0}")]
    Parse(String),

    #[error("Order niet gevonden: {0}")]
    NotFound(String),
}

// Tauri commands return errors over IPC — they must be serializable.
impl serde::Serialize for ZohoError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
