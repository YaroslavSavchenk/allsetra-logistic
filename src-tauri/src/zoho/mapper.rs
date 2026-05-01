//! Zoho JSON → our `Order` model.
//!
//! The input `serde_json::Value` mirrors whatever Zoho returned — lookup
//! fields are objects, numbers may be strings, absent fields may be `null`.
//! These helpers pull values defensively with sensible defaults; an unknown
//! field (name mismatch) degrades to an empty string rather than a hard
//! failure so one missing config doesn't take down the whole response.

use serde_json::Value;

use super::config;
use super::models::*;

pub fn json_to_order(raw: &Value, notes: Vec<OrderNote>) -> Order {
    Order {
        id: extract_str(raw, "id").unwrap_or_default(),
        order_number: extract_str(raw, config::FIELD_ORDER_NUMBER).unwrap_or_default(),
        account: extract_lookup_name(raw, config::FIELD_ACCOUNT).unwrap_or_default(),
        address: extract_str(raw, config::FIELD_ADDRESS).unwrap_or_default(),
        postcode: extract_str(raw, config::FIELD_POSTCODE).unwrap_or_default(),
        city: extract_str(raw, config::FIELD_CITY).unwrap_or_default(),
        status: extract_str(raw, config::FIELD_STATUS).unwrap_or_default(),
        created_at: extract_str(raw, config::FIELD_CREATED_AT).unwrap_or_default(),
        quote_owner: extract_lookup_name(raw, config::FIELD_OWNER).unwrap_or_default(),
        // Orders pulled from Zoho are always sales-originated.
        source: "zoho".to_string(),
        notes,
        orderpick: extract_array(raw, config::FIELD_ORDERPICK)
            .iter()
            .map(json_to_orderpick)
            .collect(),
        units: extract_array(raw, config::FIELD_UNITS)
            .iter()
            .map(json_to_unit)
            .collect(),
    }
}

pub fn json_to_product(raw: &Value) -> Product {
    // Category may be a picklist string or absent — fall back to the catch-all
    // `tracker-accessory` so the UI renders something. The frontend can
    // re-categorise based on SKU.
    let category = extract_str(raw, config::PRODUCT_FIELD_CATEGORY)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "tracker-accessory".to_string());

    Product {
        id: extract_str(raw, "id").unwrap_or_default(),
        sku: extract_str(raw, config::PRODUCT_FIELD_CODE).unwrap_or_default(),
        name: extract_str(raw, config::PRODUCT_FIELD_NAME).unwrap_or_default(),
        category,
        // Set on the JS side via the SKU-keyed IMEI strategy.
        has_imei: false,
        supplier: extract_lookup_name(raw, config::PRODUCT_FIELD_VENDOR)
            .or_else(|| extract_str(raw, config::PRODUCT_FIELD_VENDOR))
            .unwrap_or_default(),
    }
}

pub fn json_to_note(raw: &Value) -> OrderNote {
    OrderNote {
        id: extract_str(raw, "id").unwrap_or_default(),
        content: extract_str(raw, config::NOTE_FIELD_CONTENT).unwrap_or_default(),
        author: extract_lookup_name(raw, config::NOTE_FIELD_CREATED_BY).unwrap_or_default(),
        created_at: extract_str(raw, config::NOTE_FIELD_CREATED_AT).unwrap_or_default(),
        modified_at: extract_str(raw, config::NOTE_FIELD_MODIFIED_AT),
    }
}

fn json_to_unit(raw: &Value) -> Unit {
    // TODO: when Zoho integration goes live, resolve the unit type field
    // (today a free-text device-type string) to our internal product id via
    // a lookup keyed on Zoho's Products module.
    Unit {
        id: extract_str(raw, "id").unwrap_or_default(),
        imei: extract_str(raw, config::UNIT_FIELD_IMEI).unwrap_or_default(),
        product_id: extract_str(raw, config::UNIT_FIELD_TYPE).unwrap_or_default(),
    }
}

fn json_to_orderpick(raw: &Value) -> OrderpickItem {
    // TODO: resolve Zoho's product reference to our internal product id
    // (currently we pass through the lookup name which is not stable).
    let product_id = extract_lookup_name(raw, config::ORDERPICK_FIELD_PRODUCT)
        .or_else(|| extract_str(raw, config::ORDERPICK_FIELD_PRODUCT))
        .unwrap_or_default();
    let quantity = raw
        .get(config::ORDERPICK_FIELD_QUANTITY)
        .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0) as u32;
    let note = extract_str(raw, config::ORDERPICK_FIELD_NOTE).unwrap_or_default();
    OrderpickItem {
        product_id,
        quantity,
        note,
    }
}

fn extract_str(obj: &Value, key: &str) -> Option<String> {
    obj.get(key).and_then(|v| v.as_str()).map(String::from)
}

/// Zoho lookup fields come as `{"id": "...", "name": "..."}`. We want the
/// display name. Falls back to the raw string if the field isn't a lookup.
fn extract_lookup_name(obj: &Value, key: &str) -> Option<String> {
    obj.get(key).and_then(|v| {
        v.get("name")
            .and_then(|n| n.as_str())
            .map(String::from)
            .or_else(|| v.as_str().map(String::from))
    })
}

fn extract_array<'a>(obj: &'a Value, key: &str) -> &'a [Value] {
    obj.get(key)
        .and_then(|v| v.as_array())
        .map(|a| a.as_slice())
        .unwrap_or(&[])
}
