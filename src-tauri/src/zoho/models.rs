//! Rust shapes that serialize/deserialize to the same JSON as the TS
//! `Order`/`Unit`/etc. types in `src/types/order.ts`. All fields are
//! camelCase on the wire to match TS; enum-like strings (status, device
//! type) are kept as `String` so unknown Zoho values pass through
//! harmlessly instead of failing the whole response.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OrderpickItem {
    pub product: String,
    pub quantity: u32,
    pub note: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Unit {
    pub id: String,
    pub imei: String,
    #[serde(rename = "type")]
    pub type_: String,
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
    pub notes: Vec<OrderNote>,
    pub orderpick: Vec<OrderpickItem>,
    pub units: Vec<Unit>,
}
