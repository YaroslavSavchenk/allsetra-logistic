mod zoho;

use zoho::ZohoClient;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init());

    // Only manage the Zoho client when secrets are baked in. Without it,
    // the `zoho_is_configured` probe returns false and the frontend stays
    // on the mock service.
    let builder = if let Some(client) = ZohoClient::try_new() {
        log::info!("Zoho client geconfigureerd — live mode");
        builder.manage(client)
    } else {
        log::info!("Zoho niet geconfigureerd — mock mode");
        builder
    };

    builder
        .invoke_handler(tauri::generate_handler![
            zoho::commands::zoho_is_configured,
            zoho::commands::zoho_fetch_open_orders,
            zoho::commands::zoho_fetch_order,
            zoho::commands::zoho_fetch_products,
            zoho::commands::zoho_update_units,
            zoho::commands::zoho_ship_order,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
