//! Rust shapes that serialize/deserialize to the same JSON as the TS
//! `Order`/`Unit`/etc. types in `src/types/order.ts`. All fields are
//! camelCase on the wire to match TS; enum-like strings (status, device
//! type) are kept as `String` so unknown Zoho values pass through
//! harmlessly instead of failing the whole response.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderpickItem {
    pub product_id: String,
    pub quantity: u32,
    pub note: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Unit {
    pub id: String,
    pub imei: String,
    pub product_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderNote {
    pub id: String,
    pub content: String,
    pub author: String,
    pub created_at: String,
    pub modified_at: Option<String>,
}

fn default_source() -> String {
    "zoho".to_string()
}

/// Frontend `Product` shape. Mirrors `src/types/product.ts`.
///
/// `has_imei` is logistics-internal metadata that Zoho doesn't know about —
/// the Rust mapper always sets it to `false`. The JS catalog façade overlays
/// the real value based on the SKU-keyed IMEI strategy.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub category: String,
    pub has_imei: bool,
    pub supplier: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub id: String,
    pub order_number: String,
    pub account: String,
    pub address: String,
    pub postcode: String,
    pub city: String,
    pub status: String,
    pub created_at: String,
    pub quote_owner: String,
    /// `'zoho'` for sales-originated orders pulled from CRM, `'logistics'`
    /// for orders created locally by the logistics team. Zoho-fetched
    /// orders are set to `"zoho"` explicitly in the mapper; the serde
    /// default below only fires for incoming JSON payloads from the
    /// frontend (e.g. `zoho_update_units`) that omit the field.
    #[serde(default = "default_source")]
    pub source: String,
    pub notes: Vec<OrderNote>,
    pub orderpick: Vec<OrderpickItem>,
    pub units: Vec<Unit>,
}
