use tauri_plugin_log::{Target, TargetKind};
use whoami::username;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use reqwest::Client;
use futures_util::StreamExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_system_username() -> Result<String, String> {
    Ok(username()) // 跨平台获取用户名
}


#[tauri::command]
async fn download_video(url: String, save_path: String, file_name: String) -> Result<String, String> {
    // 创建一个 HTTP 客户端
    let client = Client::new();

    // 发送 GET 请求并获取响应
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    // 检查响应状态
    if !response.status().is_success() {
        return Err(format!("请求返回非成功状态码: {}", response.status()));
    }

    // 确保保存路径的目录存在
    if let Some(parent) = Path::new(&save_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    // 构建完整的文件路径
    let full_path = Path::new(&save_path).join(&file_name);
    
    // 创建文件
    let mut file = File::create(&full_path).map_err(|e| format!("创建文件失败: {}", e))?;

    // 获取响应体作为字节流并写入文件
    let mut stream = response.bytes_stream();
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("下载过程中出错: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("写入文件失败: {}", e))?;
    }

    Ok(format!("视频已成功下载到: {}", full_path.display()))
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(Target::new(TargetKind::LogDir {
                    file_name: Some("logs".to_string()),
                }))
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, get_system_username, download_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
