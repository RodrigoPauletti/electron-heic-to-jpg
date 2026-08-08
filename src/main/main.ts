import path from 'node:path';
import { BrowserWindow, app, session, shell } from 'electron';
import { APP_META } from '../shared/constants';
import { registerIpcHandlers } from './ipc/handlers';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function setupContentSecurityPolicy(): void {
  const csp = isDev
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "connect-src 'self' ws://localhost:5173 http://localhost:5173",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "connect-src 'self'",
      ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['Content-Security-Policy'] = [csp];
    callback({ responseHeaders });
  });
}

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, '../preload/preload.js');

  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 780,
    minHeight: 560,
    title: APP_META.name,
    show: false,
    backgroundColor: '#0f1419',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[renderer] did-fail-load', { errorCode, errorDescription, validatedURL });
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[renderer] render-process-gone', details);
  });

  win.webContents.on('preload-error', (_event, preloadPathFailed, error) => {
    console.error('[preload] failed to load', preloadPathFailed, error);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? url.startsWith(process.env.VITE_DEV_SERVER_URL ?? '')
      : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
    }
  });

  if (isDev) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  setupContentSecurityPolicy();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});
