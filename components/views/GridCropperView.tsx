import React from 'react';
import { Settings, Download, RefreshCw, Trash2, Grid, Maximize2, Hash, Type } from 'lucide-react';
import Dropzone from '../Dropzone';
import { useGridCropper } from '../../hooks/useGridCropper';

interface GridCropperViewProps {
  controller: ReturnType<typeof useGridCropper>;
}

const GridCropperView: React.FC<GridCropperViewProps> = ({ controller }) => {
  const {
    sourceFiles,
    currentIndex,
    setCurrentIndex,
    previewUrl,
    dimensions,
    config,
    setConfig,
    isProcessing,
    handleFilesAdded,
    removeFile,
    clearSource,
    exportGrid
  } = controller;

  const safeCols = Math.max(1, config.cols || 1);
  const safeRows = Math.max(1, config.rows || 1);
  const cw = dimensions.width / safeCols;
  const ch = dimensions.height / safeRows;

  return (
    <main className="h-[660px] max-h-[660px] grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
      
      {/* Left Column: Preview */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-0">
        {sourceFiles.length === 0 ? (
          <div className="h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex-1">
               <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} multiple={true} />
            </div>
            <div className="mt-4 flex flex-col items-center justify-center text-cyber-dim/40 border-2 border-dashed border-cyber-border/30 rounded-xl bg-cyber-black/20 p-4">
               <div className="relative">
                  <Grid size={40} strokeWidth={0.5} className="text-cyber-border" />
               </div>
               <p className="mt-2 font-mono text-[10px] tracking-[0.3em] uppercase">Grid Processor Awaiting Input</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300 min-h-0">
            <div className="flex items-center justify-between mb-3 px-2 border-b border-cyber-border/50 pb-2 shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-cyber-text uppercase tracking-wider text-[11px] flex items-center gap-3">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-primary"></span></span>
                  Grid Manifest <span className="text-cyber-dim font-mono text-[10px]">[{dimensions.width}x{dimensions.height}]</span>
                </h3>
                <div className="flex items-center gap-1 bg-cyber-black/40 px-2 py-0.5 rounded border border-cyber-border/30">
                  <span className="text-[9px] font-mono text-cyber-primary uppercase tracking-tighter">Batch:</span>
                  <span className="text-[10px] font-mono text-cyber-text">{sourceFiles.length} files</span>
                </div>
              </div>
              <button onClick={clearSource} className="text-[9px] font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-sm border border-red-500/20 transition-colors flex items-center gap-1.5 uppercase tracking-wide">
                <Trash2 size={10} /> Clear All
              </button>
            </div>
            
            <div className="bg-cyber-panel/20 border border-cyber-border rounded-lg flex-1 overflow-hidden flex flex-col relative backdrop-blur-sm shadow-inner min-h-0">
              {/* File Selector Tabs */}
              <div className="flex overflow-x-auto bg-cyber-black/60 border-b border-cyber-border/50 custom-scrollbar shrink-0">
                {sourceFiles.map((file, idx) => (
                  <div 
                    key={`${file.name}-${idx}`}
                    className={`
                      flex items-center gap-2 px-3 py-2 border-r border-cyber-border/30 cursor-pointer transition-all shrink-0
                      ${currentIndex === idx ? 'bg-cyber-primary/10 text-cyber-primary border-b-2 border-b-cyber-primary' : 'text-cyber-dim hover:bg-cyber-white/5'}
                    `}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    <span className="text-[10px] font-mono max-w-[80px] truncate">{file.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="hover:text-red-400 p-0.5"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) handleFilesAdded(Array.from(files));
                    };
                    input.click();
                  }}
                  className="px-4 py-2 text-cyber-primary hover:bg-cyber-primary/10 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2"
                >
                  + Add
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-cyber-black/40 relative group">
                {previewUrl && (
                  <div className="relative inline-block shadow-2xl border border-cyber-border/30">
                    <img 
                      src={previewUrl} 
                      alt="Source" 
                      className="max-w-full max-h-[450px] object-contain"
                    />
                    
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {Array.from({ length: safeRows }).map((_, r) => (
                        Array.from({ length: safeCols }).map((_, c) => {
                          const centerX = (c + 0.5) * (100 / safeCols);
                          const centerY = (r + 0.5) * (100 / safeRows);
                          
                          // Calculate display size based on image display dimensions
                          // This is a bit tricky because of object-contain, but we can use CSS percentages for the grid lines
                          return (
                            <React.Fragment key={`${r}-${c}`}>
                              {/* Grid Cell Border */}
                              <div 
                                className="absolute border border-cyber-primary/30"
                                style={{
                                  top: `${r * (100 / safeRows)}%`,
                                  left: `${c * (100 / safeCols)}%`,
                                  width: `${100 / safeCols}%`,
                                  height: `${100 / safeRows}%`,
                                }}
                              />
                              {/* Center Point */}
                              <div 
                                className="absolute w-1 h-1 bg-cyber-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_5px_rgba(6,182,212,0.8)]"
                                style={{ top: `${centerY}%`, left: `${centerX}%` }}
                              />
                              {/* Avatar Crop Area (Visual only) */}
                              <div 
                                className="absolute border-2 border-cyber-accent border-dashed"
                                style={{
                                  top: `${centerY}%`,
                                  left: `${centerX}%`,
                                  width: `${(Math.min(cw, ch * (config.avatarWidth / (config.avatarHeight || 1))) * config.cropScale / dimensions.width) * 100}%`,
                                  height: `${(Math.min(ch, cw * (config.avatarHeight / (config.avatarWidth || 1))) * config.cropScale / dimensions.height) * 100}%`,
                                  transform: 'translate(-50%, -50%)',
                                  filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8)) drop-shadow(0 0 8px rgba(244,63,94,0.4))',
                                }}
                              />
                            </React.Fragment>
                          );
                        })
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-cyber-black/90 border-t border-cyber-border p-3 text-[10px] text-cyber-dim flex justify-between items-center backdrop-blur font-mono shrink-0">
                <div className="flex items-center gap-4">
                  <span>GRID: <span className="text-cyber-primary">{config.cols}x{config.rows}</span></span>
                  <span className="w-px h-3 bg-cyber-border"></span>
                  <span>OUTPUT: <span className="text-cyber-accent">{config.avatarWidth}x{config.avatarHeight}px</span></span>
                </div>
                <span className="text-cyber-dim/60 italic uppercase tracking-tighter">Central Anchor Point Calculation Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Settings */}
      <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-1">
        <div className="bg-cyber-panel/40 backdrop-blur-md border border-cyber-border p-5 shadow-2xl relative overflow-hidden flex flex-col shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-primary to-transparent opacity-50"></div>
          
          <h2 className="text-sm font-bold text-cyber-text mb-5 flex items-center gap-3 font-mono uppercase tracking-wide">
            <Settings size={16} className="text-cyber-primary" />
            Grid Config
          </h2>
          
          <div className="space-y-6">
            {/* Grid Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-1.5">
                  <Grid size={10} /> Rows
                </label>
                <input 
                  type="number"
                  value={config.rows || ''}
                  onChange={(e) => setConfig({...config, rows: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                  className="w-full bg-cyber-black border border-cyber-border text-[10px] font-mono p-2 text-cyber-text outline-none focus:border-cyber-primary transition-colors"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-1.5">
                  <Grid size={10} /> Columns
                </label>
                <input 
                  type="number"
                  value={config.cols || ''}
                  onChange={(e) => setConfig({...config, cols: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                  className="w-full bg-cyber-black border border-cyber-border text-[10px] font-mono p-2 text-cyber-text outline-none focus:border-cyber-primary transition-colors"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Avatar Output Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-1.5">
                  <Maximize2 size={10} /> Output W
                </label>
                <input 
                  type="number"
                  value={config.avatarWidth || ''}
                  onChange={(e) => setConfig({...config, avatarWidth: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                  className="w-full bg-cyber-black border border-cyber-border text-[10px] font-mono p-2 text-cyber-text outline-none focus:border-cyber-accent transition-colors"
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-1.5">
                  <Maximize2 size={10} /> Output H
                </label>
                <input 
                  type="number"
                  value={config.avatarHeight || ''}
                  onChange={(e) => setConfig({...config, avatarHeight: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                  className="w-full bg-cyber-black border border-cyber-border text-[10px] font-mono p-2 text-cyber-text outline-none focus:border-cyber-accent transition-colors"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Crop Scale */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-1.5">
                  <Maximize2 size={10} /> Crop Scale
                </label>
                <span className="text-[9px] font-mono text-cyber-primary">{Math.round(config.cropScale * 100)}%</span>
              </div>
              <div className="relative w-full h-2.5 bg-cyber-black rounded-sm overflow-hidden border border-cyber-border shadow-inner">
                <div className="absolute h-full bg-gradient-to-r from-cyber-primary/30 to-cyber-primary/60" style={{width: `${(config.cropScale / 2) * 100}%`}} />
                <input 
                  type="range" min="10" max="200" step="1"
                  value={config.cropScale * 100}
                  onChange={(e) => setConfig({...config, cropScale: Number(e.target.value) / 100})}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isProcessing}
                />
              </div>
              <p className="text-[8px] text-cyber-dim/60 font-mono italic">Adjust the size of the crop area within the grid cell.</p>
            </div>

            {/* Export Settings */}
            <div className="space-y-4 border-t border-cyber-border/30 pt-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-1.5">
                  <Type size={10} /> Export Name
                </label>
                <input 
                  type="text"
                  value={config.exportName}
                  onChange={(e) => setConfig({...config, exportName: e.target.value})}
                  className="w-full bg-cyber-black border border-cyber-border text-[10px] font-mono p-2 text-cyber-text outline-none focus:border-cyber-primary transition-colors"
                  placeholder="avatar"
                  disabled={isProcessing}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-1.5">
                  <Hash size={10} /> Start Index
                </label>
                <input 
                  type="number"
                  value={config.startNumber === 0 ? '0' : config.startNumber || ''}
                  onChange={(e) => setConfig({...config, startNumber: e.target.value === '' ? 0 : parseInt(e.target.value) || 0})}
                  className="w-full bg-cyber-black border border-cyber-border text-[10px] font-mono p-2 text-cyber-text outline-none focus:border-cyber-primary transition-colors"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Quality */}
            <div className="group">
              <div className="flex justify-between mb-2">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-widest">Quality</label>
                <span className="text-[9px] font-mono text-cyber-primary bg-cyber-primary/10 px-1.5 py-0.5 rounded">
                  {Math.round(config.quality * 100)}%
                </span>
              </div>
              <div className="relative w-full h-2.5 bg-cyber-black rounded-sm overflow-hidden border border-cyber-border shadow-inner">
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

            {/* Action */}
            <div className="pt-2">
              <button
                onClick={exportGrid}
                disabled={isProcessing || sourceFiles.length === 0}
                className={`
                  w-full py-3 px-4 relative group overflow-hidden transition-all rounded-sm
                  ${isProcessing || sourceFiles.length === 0
                    ? 'bg-cyber-dark border border-cyber-border cursor-not-allowed opacity-50' 
                    : 'bg-cyber-primary/10 hover:bg-cyber-primary/20 border border-cyber-primary text-cyber-primary hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  }
                `}
              >
                <div className="absolute inset-0 w-1 bg-cyber-primary transition-all duration-300 group-hover:w-full opacity-5"></div>
                <div className="flex items-center justify-center gap-2 font-bold uppercase tracking-widest relative z-10">
                  {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                  <span className="text-[10px]">{isProcessing ? 'PROCESSING...' : `Export ${sourceFiles.length > 1 ? 'Batch' : 'Grid'} ZIP`}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
};

export default GridCropperView;
