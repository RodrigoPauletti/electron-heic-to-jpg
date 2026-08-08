import { useEffect, useState } from 'react';
import { APP_META } from '../shared/constants';
import { ActionBar } from './components/ActionBar';
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
    removeFile,
    requestPreview,
    convert,
    cancelConversion,
    openOutputFolder,
  } = useConverter();

  const [version, setVersion] = useState(APP_META.version);
  const hasFiles = files.length > 0;
  const showProgressDock = Boolean((isConverting || summary) && hasFiles);
  const actionsDisabled = isConverting || !apiReady;

  useEffect(() => {
    if (!window.heicConverter) {
      return;
    }

    void window.heicConverter.getAppInfo().then((info) => {
      setVersion(info.version);
    });
  }, []);

  return (
    <div
      className={`app has-bottom-dock${hasFiles ? ' has-files' : ''}${
        showProgressDock ? ' has-progress-dock' : ''
      }`}
    >
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
          onQualityChange={setQuality}
          onChooseOutputDir={chooseOutputDir}
        />

        {notice ? <div className="notice">{notice}</div> : null}
        {errorMessage ? (
          <div className="notice" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {hasFiles ? (
          <FileList
            files={files}
            canRemove={!isConverting}
            canAdd={!isConverting && apiReady}
            onRemove={removeFile}
            onAddFiles={addFilesViaDialog}
            onRequestPreview={requestPreview}
          />
        ) : null}

        {!isConverting && !hasFiles ? (
          <DropZone
            disabled={!apiReady}
            onPaths={(paths) => {
              void addFromPaths(paths);
            }}
            onBrowse={addFilesViaDialog}
          />
        ) : null}
      </main>

      <div className="bottom-dock">
        {showProgressDock ? (
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
            onCancel={() => {
              void cancelConversion();
            }}
          />
        ) : null}
        <ActionBar
          disabled={actionsDisabled}
          canConvert={apiReady && hasFiles && Boolean(outputDir) && !isConverting}
          canClear={hasFiles && !isConverting}
          isConverting={isConverting}
          fileCount={files.length}
          onConvert={convert}
          onClear={clearList}
        />
      </div>
    </div>
  );
}
