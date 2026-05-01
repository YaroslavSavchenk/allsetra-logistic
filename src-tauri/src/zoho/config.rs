//! Compile-time Zoho configuration.
//!
//! Secrets (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) come from env vars at
//! build time via `option_env!`. Presence is probed at runtime by
//! [`is_configured`]; when absent, the frontend falls back to the mock
//! service so dev builds work without credentials. CI injects the secrets as
//! env vars before `tauri build`.
//!
//! Non-secret config (URLs, module + field names) has defaults here and can
//! be overridden at build time if needed.

// ─── Secrets (required for Zoho calls) ───────────────────────────────────────

pub fn client_id() -> Option<&'static str> {
    option_env!("ZOHO_CLIENT_ID")
}

pub fn client_secret() -> Option<&'static str> {
    option_env!("ZOHO_CLIENT_SECRET")
}

pub fn refresh_token() -> Option<&'static str> {
    option_env!("ZOHO_REFRESH_TOKEN")
}

pub fn is_configured() -> bool {
    client_id().is_some() && client_secret().is_some() && refresh_token().is_some()
}

// ─── URLs ────────────────────────────────────────────────────────────────────

pub fn api_base() -> &'static str {
    option_env!("ZOHO_API_BASE").unwrap_or("https://sandbox.zohoapis.eu")
}

pub fn accounts_url() -> &'static str {
    option_env!("ZOHO_ACCOUNTS_URL").unwrap_or("https://accounts.zoho.eu")
}

pub fn module() -> &'static str {
    option_env!("ZOHO_MODULE").unwrap_or("RouteConnectOrders_test")
}

/// Zoho Products module — standard module is `Products`. Override via
/// `ZOHO_PRODUCTS_MODULE` build-time env var if a custom module is used.
pub fn products_module() -> &'static str {
    option_env!("ZOHO_PRODUCTS_MODULE").unwrap_or("Products")
}

// ─── Field API names ─────────────────────────────────────────────────────────
//
// Best-guess mappings from the project plan. **Confirm each against the
// real Zoho module schema and update if wrong** — an API-name mismatch makes
// the whole integration silently return empty fields.

pub const FIELD_ORDER_NUMBER: &str = "Name";
pub const FIELD_ACCOUNT: &str = "Account";
pub const FIELD_ADDRESS: &str = "Adres";
pub const FIELD_POSTCODE: &str = "Postcode";
pub const FIELD_CITY: &str = "Plaats";
pub const FIELD_STATUS: &str = "Status";
pub const FIELD_OWNER: &str = "Owner";
pub const FIELD_CREATED_AT: &str = "Created_Time";
pub const FIELD_UNITS: &str = "Units";
pub const FIELD_ORDERPICK: &str = "orderpick";

// Units subform fields
pub const UNIT_FIELD_IMEI: &str = "IMEI";
pub const UNIT_FIELD_TYPE: &str = "Type";

// Orderpick subform fields
pub const ORDERPICK_FIELD_PRODUCT: &str = "Product";
pub const ORDERPICK_FIELD_QUANTITY: &str = "Quantity";
pub const ORDERPICK_FIELD_NOTE: &str = "Note";

// Notes (Zoho's built-in Notes entity)
pub const NOTE_FIELD_CONTENT: &str = "Note_Content";
pub const NOTE_FIELD_CREATED_BY: &str = "Created_By";
pub const NOTE_FIELD_CREATED_AT: &str = "Created_Time";
pub const NOTE_FIELD_MODIFIED_AT: &str = "Modified_Time";

// Products module fields. Standard Zoho Products module names — override via
// constants below if your module uses different API names.
pub const PRODUCT_FIELD_NAME: &str = "Product_Name";
pub const PRODUCT_FIELD_CODE: &str = "Product_Code";
pub const PRODUCT_FIELD_CATEGORY: &str = "Product_Category";
pub const PRODUCT_FIELD_VENDOR: &str = "Vendor_Name";
pub const PRODUCT_FIELD_ACTIVE: &str = "Product_Active";

// ─── Status picklist values (exact spelling) ────────────────────────────────

pub const STATUS_NIEUW: &str = "Nieuw";
pub const STATUS_IN_BEHANDELING: &str = "In behandeling";
pub const STATUS_VERSTUURD: &str = "Verstuurd";
