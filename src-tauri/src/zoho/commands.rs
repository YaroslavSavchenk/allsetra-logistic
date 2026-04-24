//! Tauri commands exposed to the frontend. The frontend talks to these via
//! `invoke('zoho_...')` in `src/services/zohoOrderService.ts`. The
//! `zoho_is_configured` probe lets the frontend know whether to use the real
//! service or fall back to mock.

use std::sync::Arc;

use serde_json::{json, Value};
use tauri::State;

use super::client::ZohoClient;
use super::config;
use super::error::ZohoError;
use super::mapper;
use super::models::*;

#[tauri::command]
pub fn zoho_is_configured() -> bool {
    config::is_configured()
}

#[tauri::command]
pub async fn zoho_fetch_open_orders(
    client: State<'_, Arc<ZohoClient>>,
) -> Result<Vec<Order>, ZohoError> {
    let criteria = format!(
        "({status_field}:equals:{nieuw})or({status_field}:equals:{in_behandeling})",
        status_field = config::FIELD_STATUS,
        nieuw = config::STATUS_NIEUW,
        in_behandeling = config::STATUS_IN_BEHANDELING,
    );
    let encoded = urlencoding::encode(&criteria);
    let path = format!(
        "/crm/v8/{module}/search?criteria={encoded}&per_page=100",
        module = config::module(),
    );

    let response: Value = client.get(&path).await?;
    let items = response
        .get("data")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // Skip notes for the list view — fetching notes per order would be N+1
    // round-trips. Notes get loaded when the user opens an order.
    Ok(items
        .iter()
        .map(|raw| mapper::json_to_order(raw, Vec::new()))
        .collect())
}

#[tauri::command]
pub async fn zoho_fetch_order(
    id: String,
    client: State<'_, Arc<ZohoClient>>,
) -> Result<Order, ZohoError> {
    fetch_order_impl(&id, client.inner().as_ref()).await
}

#[tauri::command]
pub async fn zoho_update_units(
    id: String,
    units: Vec<Unit>,
    client: State<'_, Arc<ZohoClient>>,
) -> Result<Order, ZohoError> {
    // Zoho subforms: we MUST send the full rows array — missing rows get
    // deleted server-side.
    let unit_rows: Vec<Value> = units
        .iter()
        .map(|u| {
            json!({
                config::UNIT_FIELD_IMEI: u.imei,
                config::UNIT_FIELD_TYPE: u.type_,
            })
        })
        .collect();

    let body = json!({ "data": [{ config::FIELD_UNITS: unit_rows }] });
    let path = format!("/crm/v8/{}/{}", config::module(), id);
    let _: Value = client.put(&path, body).await?;

    fetch_order_impl(&id, client.inner().as_ref()).await
}

#[tauri::command]
pub async fn zoho_ship_order(
    id: String,
    client: State<'_, Arc<ZohoClient>>,
) -> Result<Order, ZohoError> {
    let body = json!({ "data": [{ config::FIELD_STATUS: config::STATUS_VERSTUURD }] });
    let path = format!("/crm/v8/{}/{}", config::module(), id);
    let _: Value = client.put(&path, body).await?;

    fetch_order_impl(&id, client.inner().as_ref()).await
}

async fn fetch_order_impl(id: &str, client: &ZohoClient) -> Result<Order, ZohoError> {
    let order_path = format!("/crm/v8/{}/{}", config::module(), id);
    let notes_path = format!("/crm/v8/{}/{}/Notes?per_page=50", config::module(), id);

    let (order_res, notes_res) = tokio::join!(
        client.get::<Value>(&order_path),
        client.get::<Value>(&notes_path),
    );

    let order_raw_value = order_res?;
    let order_raw = order_raw_value
        .get("data")
        .and_then(|d| d.as_array())
        .and_then(|a| a.first())
        .ok_or_else(|| ZohoError::NotFound(id.to_string()))?;

    // Notes may fail (permissions, etc.) — degrade to empty rather than
    // failing the whole fetch. The UI treats no-notes as "no alert".
    let notes: Vec<OrderNote> = match notes_res {
        Ok(resp) => resp
            .get("data")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
            .iter()
            .map(mapper::json_to_note)
            .collect(),
        Err(e) => {
            log::warn!("Kon notes voor order {id} niet ophalen: {e}");
            Vec::new()
        }
    };

    Ok(mapper::json_to_order(order_raw, notes))
}
