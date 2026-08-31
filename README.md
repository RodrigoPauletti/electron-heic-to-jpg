# HEIC Converter

Offline desktop app to convert **HEIC/HEIF** images to **JPEG**. Built with Electron — conversion runs locally with no uploads or network access.

## Features

- Batch conversion with multi-file selection and drag & drop (files and folders)
- Automatic filtering for `.heic` and `.heif` files
- Configurable JPEG quality: 80, 90, 95, or 100
- Per-file and overall progress tracking
- Unique output filenames (no overwrites)
- Individual file errors do not stop the batch
- Default output folder: `Documents/Converted`
- Open output folder when done

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Desktop | [Electron](https://www.electronjs.org/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| UI | [React](https://react.dev/) + [Vite](https://vitejs.dev/) |
| Conversion | [heic-convert](https://www.npmjs.com/package/heic-convert) (libheif via WASM) |
| Packaging | [electron-builder](https://www.electron.build/) |

Conversion runs in the main process over a secure IPC bridge (`contextIsolation`, preload script). The renderer has no direct access to the filesystem or Node APIs.

## Supported Platforms

| Platform | Architectures | Installer |
| --- | --- | --- |
| **macOS** | Apple Silicon (`arm64`) and Intel (`x64`) | DMG, ZIP |
| **Windows** | x64 | NSIS installer |
| **Linux** | x64 and arm64 | AppImage, deb |

> **Note:** Cross-platform builds may require extra setup (e.g. Wine for Windows on macOS). For best results, run each platform's `dist:*` script on a native host or CI runner.

## Requirements

- [Node.js](https://nodejs.org/) 18 or later
- npm

## Getting Started

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

This will:

1. Compile the main process and preload script (`dist/`)
2. Start the Vite dev server for the renderer (`http://localhost:5173`)
3. Launch Electron with hot reload

Other useful scripts:

| Command | Description |
| --- | --- |
| `npm run build` | Compile main, preload, and renderer |
| `npm run preview` | Run the compiled app locally (no installer) |

## Building Installers

Artifacts are written to the `release/` directory.

### macOS (Apple Silicon + Intel)

```bash
npm run dist:mac
```

Produces DMG and ZIP packages for both `arm64` and `x64`.

Build a single architecture:

```bash
npm run dist:mac:arm64   # Apple Silicon only
npm run dist:mac:x64     # Intel only
```

### Windows (x64)

```bash
npm run dist:win
```

Produces an NSIS installer in `release/`.

### Linux (x64 + arm64)

```bash
npm run dist:linux
```

Produces AppImage and deb packages in `release/`.

Build a single architecture:

```bash
npm run dist:linux:x64     # x64 only
npm run dist:linux:arm64   # arm64 only
```

> Run Linux builds on a Linux machine. AppImage works on most distributions without installation; deb targets Debian and Ubuntu.

### All platforms

```bash
npm run dist
```

Runs `electron-builder` with the targets defined in `package.json`.

## Project Structure

```text
src/
├── main/           # Electron main process, IPC handlers, conversion logic
├── preload/        # Secure bridge between main and renderer
├── renderer/       # React UI (Vite)
└── shared/         # Types and constants shared across processes
```

## License

MIT
