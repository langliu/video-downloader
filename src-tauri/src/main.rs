// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use fix_path_env::fix;

fn main() {
    let _ = fix();
    f2_desktop_lib::run()
}
