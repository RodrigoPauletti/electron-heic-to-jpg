# App Icons

Source file included: `icon.svg`.

To use a custom icon in installers:

1. Export `icon.svg` to PNG at **1024×1024**
2. Save as `build/icon.png`
3. In `package.json`, under `build.mac`, `build.win`, and `build.linux`, add:

```json
"icon": "build/icon.png"
```

electron-builder generates `.icns` (macOS), `.ico` (Windows), and Linux icons from the PNG.
