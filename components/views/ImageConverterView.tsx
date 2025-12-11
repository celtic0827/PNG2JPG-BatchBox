import React from 'react';
import { Settings, Download, RefreshCw, Trash2, Layers, Box, Minimize2 } from 'lucide-react';
import Dropzone from '../Dropzone';
import FileItem from '../FileItem';
import { formatBytes } from '../../utils/imageHelper';
import { useImageConverter } from '../../hooks/useImageConverter';

interface ImageConverterViewProps {
  controller: ReturnType<typeof useImageConverter>;
}

const ImageConverterView: React.FC<ImageConverterViewProps> = ({ controller }) => {
  const {
    files,
    isProcessing,
    config,
    setConfig,
    processedCount,
    stats,
    handleFilesAdded,
    handleRemoveFile,
    handleClearAll,
    startConversion,
    downloadZip
  } = controller;

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Left Column: Settings */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-cyber-panel/40 backdrop-blur-md border border-cyber-border p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-primary to-transparent opacity-50"></div>
          
          <h2 className="text-lg font-bold text-cyber-text mb-6 flex items-center gap-3 font-mono uppercase tracking-wide">
            <Settings size={18} className="text-cyber-primary" />
            Control Panel
          </h2>
          
          <div className="space-y-8">
            {/* Quality */}
            <div className="group">
              <div className="flex justify-between mb-3">
                <label className="text-xs font-bold text-cyber-dim uppercase tracking-widest">Quality</label>
                <span className="text-xs font-mono text-cyber-primary bg-cyber-primary/10 px-2 py-0.5 rounded">
                  {Math.round(config.quality * 100)}%
                </span>
              </div>
              <div className="relative w-full h-3 bg-cyber-black rounded-sm overflow-hidden border border-cyber-border shadow-inner">
                <div className="absolute h-full bg-gradient-to-r from-cyber-primary/50 to-cyber-primary" style={{width: `${config.quality * 100}%`}} />
                <input 
                  type="range" min="10" max="100" step="1"
                  value={config.quality * 100}
                  onChange={(e) => setConfig({...config, quality: Number(e.target.value) / 100})}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Resize */}
            <div className="group">
              <div className="flex justify-between mb-3">
                <label className="text-xs font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-2">
                   <Minimize2 size={12} /> Resize Scale
                </label>
                <span className="text-xs font-mono text-cyber-accent bg-cyber-accent/10 px-2 py-0.5 rounded">
                  {Math.round(config.scale * 100)}%
                </span>
              </div>
              <div className="relative w-full h-3 bg-cyber-black rounded-sm overflow-hidden border border-cyber-border shadow-inner">
                <div className="absolute h-full bg-gradient-to-r from-cyber-accent/50 to-cyber-accent" style={{width: `${config.scale * 100}%`}} />
                <input 
                  type="range" min="1" max="100" step="1"
                  value={config.scale * 100}
                  onChange={(e) => setConfig({...config, scale: Number(e.target.value) / 100})}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-bold text-cyber-dim mb-3 uppercase tracking-widest">Matte Color</label>
              <div className="flex items-center gap-3 bg-cyber-black p-2.5 border border-cyber-border hover:border-cyber-primary/30 transition-colors group">
                <input 
                  type="color" value={config.fillColor}
                  onChange={(e) => setConfig({...config, fillColor: e.target.value})}
                  className="h-8 w-8 p-0 border-none bg-transparent cursor-pointer rounded-sm overflow-hidden ring-1 ring-cyber-border group-hover:ring-cyber-primary"
                  disabled={isProcessing}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-mono text-cyber-text">{config.fillColor.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-cyber-border/50 pt-6 space-y-4">
              <button
                onClick={startConversion}
                disabled={isProcessing || files.length === 0 || stats.completed === files.length}
                className={`
                  w-full py-4 px-4 relative group overflow-hidden transition-all
                  ${isProcessing || files.length === 0 || stats.completed === files.length
                    ? 'bg-cyber-dark border border-cyber-border cursor-not-allowed opacity-50' 
                    : 'bg-cyber-primary/10 hover:bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  }
                `}
              >
                <div className="absolute inset-0 w-1 bg-cyber-primary transition-all duration-300 group-hover:w-full opacity-10"></div>
                <div className="flex items-center justify-center gap-3 font-bold uppercase tracking-widest relative z-10">
                  {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                  <span className="text-sm">{isProcessing ? `Processing (${processedCount}/${files.length})` : 'Execute Batch'}</span>
                </div>
              </button>

             {stats.completed > 0 && !isProcessing && (
              <button
                onClick={downloadZip}
                className="w-full py-4 px-4 relative overflow-hidden group bg-cyber-accent/10 hover:bg-cyber-accent/20 border border-cyber-accent text-cyber-accent transition-all hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]"
              >
                <div className="absolute inset-0 w-1 bg-cyber-accent transition-all duration-300 group-hover:w-full opacity-10"></div>
                <div className="flex items-center justify-center gap-3 font-bold uppercase tracking-widest relative z-10">
                  <Download size={18} />
                  <span className="text-sm">Export ZIP Archive</span>
                </div>
              </button>
            )}
            </div>
          </div>
        </div>
        
        {/* Compact Dropzone */}
        {files.length > 0 && <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} compact={true} />}
      </div>

      {/* Right Column: Files */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
        {files.length === 0 ? (
          <div className="h-full flex flex-col animate-in fade-in duration-500">
            <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} />
            <div className="flex-1 mt-6 flex flex-col items-center justify-center text-cyber-dim/40 border-2 border-dashed border-cyber-border/30 rounded-xl bg-cyber-black/20 p-8">
               <div className="relative">
                  <Layers size={80} strokeWidth={0.5} className="text-cyber-border" />
                  <Box size={40} strokeWidth={0.5} className="absolute bottom-0 right-0 text-cyber-border bg-cyber-black" />
               </div>
               <p className="mt-6 font-mono text-sm tracking-[0.3em] uppercase">Container Empty</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4 px-2 border-b border-cyber-border/50 pb-3">
              <h3 className="font-bold text-cyber-text uppercase tracking-wider text-sm flex items-center gap-3">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-primary opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-primary"></span></span>
                Image Manifest <span className="text-cyber-dim font-mono text-xs">[{files.length}]</span>
              </h3>
              {!isProcessing && (
                <button onClick={handleClearAll} className="text-[10px] font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-sm border border-red-500/20 transition-colors flex items-center gap-2 uppercase tracking-wide">
                  <Trash2 size={12} /> Purge All
                </button>
              )}
            </div>
            <div className="bg-cyber-panel/20 border border-cyber-border rounded-lg flex-1 overflow-hidden flex flex-col relative backdrop-blur-sm shadow-inner">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-pb-8">
                {files.map((file) => (
                  <FileItem key={file.id} item={file} onRemove={isProcessing ? () => {} : handleRemoveFile} />
                ))}
                <div className="h-8"></div>
              </div>
              <div className="bg-cyber-black/90 border-t border-cyber-border p-4 text-xs text-cyber-dim flex justify-between items-center backdrop-blur font-mono shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-10">
                <div className="flex items-center gap-4">
                  <span>STATUS: <span className={isProcessing ? "text-cyber-primary animate-pulse" : "text-emerald-500"}>{isProcessing ? 'PROCESSING...' : 'READY'}</span></span>
                  <span className="w-px h-3 bg-cyber-border"></span>
                  <span>COMPLETED: <span className="text-cyber-text">{stats.completed}</span></span>
                </div>
                {stats.totalConvertedSize > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-2 text-cyber-text/80 bg-cyber-panel/50 px-3 py-1 rounded border border-cyber-border/50">
                    <span>NET OUTPUT:</span>
                    <span className="text-cyber-primary font-bold">{formatBytes(stats.totalConvertedSize)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ImageConverterView;