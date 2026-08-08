# HEIC Converter

Aplicativo desktop **offline** para converter imagens **HEIC/HEIF → JPG** no **macOS** (Apple Silicon e Intel) e **Windows** (x64).

Stack: **Electron + TypeScript + React + Vite**, com conversão no **main process** via IPC seguro.

---

## Decisão da biblioteca de conversão

| Opção | Prós | Contras |
| --- | --- | --- |
| **heic-convert** (libheif WASM) | Offline, macOS/Windows, arm64/x64, sem binários nativos, fácil de empacotar no Electron, licença permissiva | Encoder JPEG simples; metadados EXIF completos não são regravados |
| sharp + libheif | Excelente qualidade/performance de encode | Empacotar libheif nativo para Windows + macOS arm/x64 é frágil |
| heic2any | Bom no browser | Pensado para renderer; menos adequado à arquitetura segura pedida |
| ImageMagick / CLI externo | Poderoso | Dependência externa, pior UX de distribuição |

**Escolha: `heic-convert`.**

Motivos: funciona 100% offline, mesma implementação em todas as plataformas, não exige toolchain nativa, empacota bem com electron-builder e mantém a conversão no main process. A orientação da imagem é aplicada na decodificação (libheif). Qualidade JPEG configurável (padrão 95%).

---

## Estrutura

```text
src/
├── main/
│   ├── main.ts
│   ├── ipc/handlers.ts
│   └── services/
│       ├── image-converter.ts
│       ├── file-system.ts
│       └── path-utils.ts
├── preload/
│   └── preload.ts
├── renderer/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
└── shared/
    ├── constants.ts
    └── types.ts
```

Metadados centralizados em `src/shared/constants.ts` e `package.json` (`productName`, `version`, `author`, `build.appId`).

---

## Dependências

### Produção
- `heic-convert` — conversão HEIC/HEIF → JPEG (WASM)

### Desenvolvimento
- `electron`, `electron-builder`
- `typescript`, `vite`, `@vitejs/plugin-react`
- `react`, `react-dom`
- `concurrently`, `wait-on`, `cross-env`
- `@types/node`, `@types/react`, `@types/react-dom`

### Instalação

```bash
npm install
```

---

## Desenvolvimento

```bash
npm run dev
```

Isso:
1. Compila `main` + `preload` (TypeScript → `dist/`)
2. Sobe o Vite no renderer (`http://localhost:5173`)
3. Abre o Electron com `contextIsolation` e preload

Outros scripts:
- `npm run build` — compila main/preload/renderer
- `npm run preview` — roda o app empacotado localmente (sem instalador)

---

## Build / instaladores

### macOS (Apple Silicon + Intel)

```bash
npm run dist:mac
```

Gera DMG/ZIP em `release/` para `arm64` e `x64`.

Arquiteturas isoladas:
```bash
npm run dist:mac:arm64
npm run dist:mac:x64
```

### Windows (x64)

```bash
npm run dist:win
```

Gera instalador NSIS em `release/`.

> No macOS, o build Windows geralmente exige configuração adicional (Wine) ou CI em máquina Windows. O ideal é gerar o instalador Windows em um host Windows.

### Ícone

Há um `build/icon.svg`. Para ícone nativo, exporte um PNG 1024×1024 como `build/icon.png` (o electron-builder deriva `.icns`/`.ico`). Veja `build/README.md`.

---

## Segurança Electron

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- API exposta só via `preload.ts` + `contextBridge`
- Conversão, `fs`, diálogos e `shell` apenas no main process
- Validação de caminhos absolutos e payloads IPC
- Sem `eval`, sem upload de imagens, sem rede para conversão

---

## Funcionalidades

- Seleção múltipla e drag & drop (arquivos e pastas)
- Filtro automático `.heic` / `.heif`
- Pasta padrão `Documentos/Converted`
- Qualidade JPEG: 80 / 90 / 95 / 100
- Progresso por arquivo + progresso geral
- Nomes únicos sem sobrescrita (`foto.jpg`, `foto (1).jpg`, …)
- Erros individuais sem interromper o lote
- Botão **Abrir pasta** ao finalizar
