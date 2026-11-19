use std::path::Path;
use tauri::{Emitter, Manager, WebviewWindow, WindowEvent};

#[tauri::command]
fn set_ignore_cursor_events(app: tauri::AppHandle, window_label: String, ignore: bool) -> Result<(), String> {
    let window = app
        .get_webview_window(&window_label)
        .ok_or_else(|| format!("window not found: {window_label}"))?;
    window.set_ignore_cursor_events(ignore).map_err(|error| error.to_string())
}

#[tauri::command]
fn monitor_bounds(app: tauri::AppHandle, window_label: String) -> Result<(i32, i32, u32, u32), String> {
    let window = app
        .get_webview_window(&window_label)
        .ok_or_else(|| format!("window not found: {window_label}"))?;
    let monitors = window.available_monitors().map_err(|error| error.to_string())?;
    let mut left = i32::MAX;
    let mut top = i32::MAX;
    let mut right = i32::MIN;
    let mut bottom = i32::MIN;
    for monitor in monitors {
        let position = monitor.position();
        let size = monitor.size();
        left = left.min(position.x);
        top = top.min(position.y);
        right = right.max(position.x + size.width as i32);
        bottom = bottom.max(position.y + size.height as i32);
    }
    Ok((left, top, (right - left) as u32, (bottom - top) as u32))
}

#[tauri::command]
fn save_asset(app: tauri::AppHandle, source_path: String) -> Result<String, String> {
    let source = Path::new(&source_path);
    let file_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("invalid asset name")?;
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(
        extension.as_str(),
        "gif" | "png" | "jpg" | "jpeg" | "webp"
    ) {
        return Err("unsupported asset type".into());
    }
    let destination_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("assets");
    std::fs::create_dir_all(&destination_dir).map_err(|error| error.to_string())?;
    let destination = destination_dir.join(file_name);
    std::fs::copy(source, &destination).map_err(|error| error.to_string())?;
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
fn create_pet_window(
    app: tauri::AppHandle,
    pet_id: String,
    tool_id: String,
    x: i32,
    y: i32,
) -> Result<(), String> {
    if !matches!(tool_id.as_str(), "focus" | "battery") {
        return Err("unsupported pet type".into());
    }

    let label = format!("pet-{pet_id}");
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let window = WebviewWindow::builder(
        &app,
        &label,
        tauri::WebviewUrl::App(format!("index.html?pet={tool_id}&id={pet_id}").into()),
    )
    .title("Screen Pet")
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .position(x as f64, y as f64)
    .inner_size(220.0, 220.0)
    .visible(false)
    .build()
    .map_err(|error| error.to_string())?;

    window
        .set_ignore_cursor_events(true)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn close_pet_window(app: tauri::AppHandle, pet_id: String) -> Result<(), String> {
    let label = format!("pet-{pet_id}");
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn set_pet_window_visible(app: tauri::AppHandle, pet_id: String, visible: bool) -> Result<(), String> {
    let label = format!("pet-{pet_id}");
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("window not found: {label}"))?;
    if visible {
        window.show().map_err(|error| error.to_string())?;
    } else {
        window.set_ignore_cursor_events(true).map_err(|error| error.to_string())?;
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_pet_window_state(
    app: tauri::AppHandle,
    pet_id: String,
    tool_id: String,
    x: i32,
    y: i32,
    visible: bool,
) -> Result<(), String> {
    create_pet_window(app.clone(), pet_id.clone(), tool_id, x, y)?;
    set_pet_window_visible(app, pet_id, visible)
}

#[tauri::command]
fn main_window_action(app: tauri::AppHandle, action: String) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    match action.as_str() {
        "minimize" => window.minimize(),
        "toggle-maximize" => {
            if window.is_maximized().map_err(|error| error.to_string())? {
                window.unmaximize()
            } else {
                window.maximize()
            }
        }
        "hide" => window.hide(),
        _ => return Err("unsupported main window action".into()),
    }
    .map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor_events,
            monitor_bounds,
            save_asset,
            create_pet_window,
            close_pet_window,
            set_pet_window_state,
            main_window_action
        ])
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            app
                .get_webview_window("main")
                .ok_or("main window missing")?;
            let menu = tauri::menu::MenuBuilder::new(app)
                .text("open", "Open Studio")
                .text("power", "Sleep/Wake Pet")
                .text("quit", "Quit")
                .build()?;
            let _tray = tauri::tray::TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "power" => {
                        let _ = app.emit("tray-power-toggle", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Screen Pet Studio");
}
