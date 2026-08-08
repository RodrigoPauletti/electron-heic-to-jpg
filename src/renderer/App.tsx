import { useEffect, useState } from 'react';
import { APP_META } from '../shared/constants';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { ProgressFooter } from './components/ProgressFooter';
import { Toolbar } from './components/Toolbar';
import { useConverter } from './hooks/useConverter';
import './styles/app.css';

export function App() {
  const {
    files,
    outputDir,
    quality,
    setQuality,
    isConverting,
    summary,
    notice,
    errorMessage,
    apiReady,
    stats,
    addFromPaths,
    addFilesViaDialog,
    chooseOutputDir,
    clearList,
    convert,
    openOutputFolder,
  } = useConverter();

  const [version, setVersion] = useState(APP_META.version);

  useEffect(() => {
    if (!window.heicConverter) {
      return;
    }

    void window.heicConverter.getAppInfo().then((info) => {
      setVersion(info.version);
    });
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>{APP_META.name}</h1>
          <p>Conversão HEIC → JPG offline · v{version}</p>
        </div>
      </header>

      <main className="layout">
        <Toolbar
          outputDir={outputDir}
          quality={quality}
          disabled={isConverting || !apiReady}
          canConvert={apiReady && files.length > 0 && Boolean(outputDir)}
          hasFiles={files.length > 0}
          onQualityChange={setQuality}
          onChooseOutputDir={chooseOutputDir}
          onAddFiles={addFilesViaDialog}
          onConvert={convert}
          onClear={clearList}
        />

        <DropZone
          disabled={isConverting || !apiReady}
          onPaths={(paths) => {
            void addFromPaths(paths);
          }}
          onBrowse={addFilesViaDialog}
        />

        {notice ? <div className="notice">{notice}</div> : null}
        {errorMessage ? (
          <div className="notice" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <FileList files={files} />

        <ProgressFooter
          isConverting={isConverting}
          total={stats.total}
          done={stats.done}
          failed={stats.failed}
          overall={stats.overall}
          summary={summary}
          onOpenFolder={() => {
            void openOutputFolder();
          }}
        />
      </main>
    </div>
  );
}
