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
    Unit {
        id: extract_str(raw, "id").unwrap_or_default(),
        imei: extract_str(raw, config::UNIT_FIELD_IMEI).unwrap_or_default(),
        type_: extract_str(raw, config::UNIT_FIELD_TYPE).unwrap_or_default(),
    }
}

fn json_to_orderpick(raw: &Value) -> OrderpickItem {
    let product = extract_lookup_name(raw, config::ORDERPICK_FIELD_PRODUCT)
        .or_else(|| extract_str(raw, config::ORDERPICK_FIELD_PRODUCT))
        .unwrap_or_default();
    let quantity = raw
        .get(config::ORDERPICK_FIELD_QUANTITY)
        .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
        .unwrap_or(0) as u32;
    let note = extract_str(raw, config::ORDERPICK_FIELD_NOTE).unwrap_or_default();
    OrderpickItem {
        product,
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
