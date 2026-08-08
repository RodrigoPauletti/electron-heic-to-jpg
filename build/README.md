# Ícones do aplicativo

Fonte incluída: `icon.svg`.

Para usar ícone customizado no instalador:

1. Exporte `icon.svg` para PNG **1024×1024**
2. Salve como `build/icon.png`
3. No `package.json`, em `build.mac` e `build.win`, adicione:

```json
"icon": "build/icon.png"
```

O electron-builder gera `.icns` (macOS) e `.ico` (Windows) a partir do PNG.
