import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useImageCurves } from '../../hooks/useImageCurves';
import { Activity, Download, RefreshCw, Trash2, RotateCcw, Image as ImageIcon, XCircle, Split, MousePointer2, Thermometer, Palette } from 'lucide-react';
import Dropzone from '../Dropzone';
import { applyCurvesToImage } from '../../utils/imageHelper';
import { ConversionStatus } from '../../types';

interface CurvesAdjustmentViewProps {
  controller: ReturnType<typeof useImageCurves>;
}

const CurvesAdjustmentView: React.FC<CurvesAdjustmentViewProps> = ({ controller }) => {
  const {
    files,
    points,
    colorTuning,
    setColorTuning,
    isProcessing,
    activePreviewId,
    setActivePreviewId,
    handleFilesAdded,
    handleRemoveFile,
    addPoint,
    updatePoint,
    removePoint,
    resetCurves,
    resetColorTuning,
    applyBatch,
    downloadZip,
    lut,
    referenceImage,
    handleReferenceAdded,
    clearReference,
    isABMode,
    setIsABMode,
    splitPosition,
    setSplitPosition
  } = controller;

  const graphRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  const completedCount = files.filter(f => f.status === ConversionStatus.COMPLETED).length;

  useEffect(() => {
    const activeFile = files.find(f => f.id === activePreviewId);
    if (!activeFile) {
        setPreviewBlobUrl(null);
        return;
    }

    const timer = setTimeout(async () => {
        try {
            const blob = await applyCurvesToImage(activeFile.file, lut, 0.9, colorTuning);
            const url = URL.createObjectURL(blob);
            setPreviewBlobUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        } catch (e) {
            console.error("Preview generation failed", e);
        }
    }, 40);

    return () => clearTimeout(timer);
  }, [activePreviewId, lut, files, colorTuning]); 

  const handleGraphClick = (e: React.MouseEvent) => {
    if (draggingPointId) return;
    if (!graphRef.current) return;
    const rect = graphRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const y = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));
    addPoint(x, y);
  };

  const handleMouseMoveGlobal = useCallback((e: MouseEvent) => {
    if (draggingPointId && graphRef.current) {
      const rect = graphRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
      const y = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));
      updatePoint(draggingPointId, x, y);
    }

    if (isResizingSplit && previewContainerRef.current) {
      const rect = previewContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      setSplitPosition(x);
    }
  }, [draggingPointId, isResizingSplit, updatePoint, setSplitPosition]);

  const handleMouseUpGlobal = useCallback(() => {
    setDraggingPointId(null);
    setIsResizingSplit(false);
  }, []);

  useEffect(() => {
    if (draggingPointId || isResizingSplit) {
        window.addEventListener('mousemove', handleMouseMoveGlobal);
        window.addEventListener('mouseup', handleMouseUpGlobal);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMoveGlobal);
        window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [draggingPointId, isResizingSplit, handleMouseMoveGlobal, handleMouseUpGlobal]);

  const generateSvgPath = () => {
     let d = `M 0 ${255 - lut[0]}`;
     for(let i = 1; i < 256; i++) {
         const xPercent = (i / 255) * 100;
         const yPercent = 100 - (lut[i] / 255) * 100;
         d += ` L ${xPercent.toFixed(2)}% ${yPercent.toFixed(2)}%`;
     }
     return d;
  };

  const handleReferenceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReferenceAdded(file);
    e.target.value = '';
  };

  const activeFileItem = files.find(f => f.id === activePreviewId);

  return (
    <main className="h-[660px] max-h-[660px] grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
      
      {/* Left Strip: Vertical Thumbnail Sidebar - Height Aligned */}
      <div className="lg:col-span-1 hidden lg:flex flex-col bg-cyber-black border border-cyber-border overflow-hidden rounded-sm h-full">
        <div className="p-1.5 border-b border-cyber-border bg-cyber-dark text-[9px] font-mono text-cyber-dim uppercase text-center tracking-tighter shrink-0">
          Manifest
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-1.5 custom-scrollbar">
          {files.map(file => (
            <div 
              key={file.id} 
              onClick={() => setActivePreviewId(file.id)}
              className={`
                relative w-full aspect-square cursor-pointer border rounded-sm overflow-hidden transition-all group/item
                ${activePreviewId === file.id ? 'border-cyber-primary ring-1 ring-cyber-primary' : 'border-cyber-border opacity-40 hover:opacity-100'}
              `}
            >
              <img src={file.previewUrl} className="w-full h-full object-cover" alt="" />
              {file.status === 'COMPLETED' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500"></div>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }}
                className="absolute top-0 right-0 bg-red-600 text-white p-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity"
              >
                <Trash2 size={8} />
              </button>
            </div>
          ))}
          <div className="w-full aspect-square flex-shrink-0">
            <Dropzone onFilesAdded={handleFilesAdded} compact={true} />
          </div>
        </div>
      </div>

      {/* Center Section: Main Preview Area + Color Tuning at Bottom */}
      <div className="lg:col-span-7 flex flex-col h-full bg-cyber-dark/95 border border-cyber-border rounded-sm overflow-hidden shadow-2xl">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-cyber-black/20">
             <div className="w-full max-w-lg flex flex-col items-center gap-6">
                <div className="w-full h-[320px]">
                  <Dropzone onFilesAdded={handleFilesAdded} />
                </div>
                <div>
                   <h3 className="text-cyber-text font-mono text-sm tracking-widest uppercase mb-1">Signal Awaiting Calibration</h3>
                   <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-cyber-dim/60">Drop base imagery to initialize tonal processor</p>
                </div>
             </div>
          </div>
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="bg-cyber-black border-b border-cyber-border px-3 py-1 flex items-center justify-between z-20 shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsABMode(!isABMode)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[8px] font-mono uppercase tracking-wider transition-all border ${
                    isABMode 
                    ? 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary' 
                    : 'bg-cyber-panel border-cyber-border text-cyber-dim hover:text-cyber-text'
                  }`}
                >
                  <Split size={9} />
                  {isABMode ? 'AB On' : 'AB Off'}
                </button>

                <div className="h-3 w-px bg-cyber-border/50"></div>

                <div className="flex items-center gap-1.5">
                  <label className="cursor-pointer bg-cyber-panel border border-cyber-border px-1.5 py-0.5 rounded-sm text-[8px] font-mono text-cyber-dim hover:text-cyber-text transition-all flex items-center gap-1 hover:border-cyber-primary">
                    <ImageIcon size={9} />
                    {referenceImage ? 'Swap' : 'Ref'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleReferenceInputChange} />
                  </label>
                  {referenceImage && (
                    <button onClick={clearReference} className="text-red-400 hover:text-red-300 p-0.5">
                      <XCircle size={9} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[8px] font-mono text-cyber-dim uppercase tracking-widest">
                {isABMode ? 'Comp Mode' : 'View Mode'}
              </div>
            </div>

            {/* Preview Image Area */}
            <div 
              ref={previewContainerRef}
              className="flex-1 relative overflow-hidden flex items-center justify-center bg-cyber-black select-none"
            >
                {activeFileItem ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-1.5">
                        <div className="relative border border-cyber-border/30 max-h-full max-w-full overflow-hidden group/preview bg-cyber-black">
                            <img 
                                src={previewBlobUrl || activeFileItem.previewUrl} 
                                className="max-w-full block"
                                style={{ maxHeight: '460px', objectFit: 'contain' }}
                                alt="Adjusted" 
                            />
                            {isABMode && (
                              <>
                                <div 
                                  className="absolute top-0 left-0 h-full overflow-hidden border-r border-cyber-primary/80 z-10 pointer-events-none shadow-[1px_0_8px_rgba(0,0,0,0.5)]"
                                  style={{ width: `${splitPosition}%` }}
                                >
                                  <img 
                                      src={referenceImage?.previewUrl || activeFileItem.previewUrl} 
                                      className="max-w-none block h-full w-auto"
                                      style={{ 
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        minWidth: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        objectPosition: 'center'
                                      }}
                                      alt="Original/Ref" 
                                  />
                                </div>
                                <div 
                                  className="absolute top-0 bottom-0 z-20 w-[1.5px] bg-cyber-primary cursor-col-resize group/handle flex items-center justify-center hover:bg-white transition-colors"
                                  style={{ left: `calc(${splitPosition}% - 0.75px)` }}
                                  onMouseDown={(e) => { e.preventDefault(); setIsResizingSplit(true); }}
                                >
                                   <div className="w-4 h-4 bg-cyber-primary text-cyber-black flex items-center justify-center border border-cyber-black shadow-lg rounded-full">
                                      <Split size={8} className="rotate-90" />
                                   </div>
                                </div>
                              </>
                            )}
                        </div>
                        <div className="mt-1 text-[7px] font-mono text-cyber-dim/60 bg-cyber-black px-1.5 py-0.5 border border-cyber-border/20 uppercase tracking-tighter">
                             {activeFileItem.file.name} • {activeFileItem.width}x{activeFileItem.height}
                        </div>
                    </div>
                ) : (
                    <div className="text-cyber-dim font-mono text-[9px] animate-pulse uppercase tracking-[0.2em]">Select manifest source</div>
                )}
            </div>

            {/* Color Tuning Panel */}
            <div className="bg-cyber-black/60 border-t border-cyber-border p-2.5 shrink-0 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-1.5">
                    <h2 className="text-[8px] font-bold text-cyber-text flex items-center gap-1.5 font-mono uppercase tracking-[0.2em]">
                        <Palette size={9} className="text-cyber-primary" />
                        Color Balance
                    </h2>
                    <button onClick={resetColorTuning} className="text-[7px] font-mono text-cyber-dim hover:text-cyber-primary px-1 border border-cyber-border bg-cyber-black transition-colors">
                       RESET
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    {/* Temperature Slider */}
                    <div className="space-y-0.5">
                        <div className="flex justify-between text-[7px] font-mono text-cyber-dim/80 uppercase">
                            <span className="flex items-center gap-1"><Thermometer size={7} /> Temperature</span>
                            <span className={`font-bold ${colorTuning.temperature > 0 ? 'text-orange-400' : colorTuning.temperature < 0 ? 'text-blue-400' : ''}`}>
                                {colorTuning.temperature > 0 ? '+' : ''}{colorTuning.temperature}
                            </span>
                        </div>
                        <div className="relative h-2.5 bg-gradient-to-r from-blue-700 via-cyber-black to-orange-700 border border-cyber-border/40 rounded-none overflow-hidden group/slider">
                            <input 
                                type="range" min="-100" max="100" step="1"
                                value={colorTuning.temperature}
                                onChange={(e) => setColorTuning(prev => ({ ...prev, temperature: parseInt(e.target.value) }))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="absolute top-0 bottom-0 w-[1px] bg-white shadow-[0_0_5px_white] z-0" style={{ left: `${((colorTuning.temperature + 100) / 200) * 100}%` }} />
                        </div>
                    </div>

                    {/* Tint Slider */}
                    <div className="space-y-0.5">
                        <div className="flex justify-between text-[7px] font-mono text-cyber-dim/80 uppercase">
                            <span className="flex items-center gap-1"><Palette size={7} /> Tint Offset</span>
                            <span className={`font-bold ${colorTuning.tint > 0 ? 'text-green-400' : colorTuning.tint < 0 ? 'text-fuchsia-400' : ''}`}>
                                {colorTuning.tint > 0 ? '+' : ''}{colorTuning.tint}
                            </span>
                        </div>
                        <div className="relative h-2.5 bg-gradient-to-r from-fuchsia-700 via-cyber-black to-green-700 border border-cyber-border/40 rounded-none overflow-hidden group/slider">
                            <input 
                                type="range" min="-100" max="100" step="1"
                                value={colorTuning.tint}
                                onChange={(e) => setColorTuning(prev => ({ ...prev, tint: parseInt(e.target.value) }))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="absolute top-0 bottom-0 w-[1px] bg-white shadow-[0_0_5px_white] z-0" style={{ left: `${((colorTuning.tint + 100) / 200) * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>
          </>
        )}
      </div>

      {/* Right Column: Master Curve + Actions - Aligned Height */}
      <div className="lg:col-span-4 flex flex-col gap-3 h-full overflow-hidden">
        
        {/* Curve Editor */}
        <div className="bg-cyber-panel border border-cyber-border p-2.5 flex flex-col shrink-0 rounded-sm shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-[9px] font-bold text-cyber-text flex items-center gap-1.5 font-mono uppercase tracking-[0.2em]">
                    <Activity size={10} className="text-cyber-primary" />
                    Tonal Curve
                </h2>
                <button 
                    onClick={resetCurves}
                    className="text-[7px] font-mono text-cyber-dim hover:text-cyber-primary transition-colors border border-cyber-border px-1 py-0.5 bg-cyber-black"
                >
                    <RotateCcw size={8} className="inline mr-1" /> RESET
                </button>
            </div>

            <div className="aspect-square relative bg-cyber-black border border-cyber-border/80 select-none cursor-crosshair overflow-hidden shrink-0 shadow-inner" ref={graphRef} onClick={handleGraphClick}>
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-[0.03]">
                    {[...Array(16)].map((_, i) => <div key={i} className="border border-cyber-dim"></div>)}
                </div>
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                    {/* Reference Diagonal Line */}
                    <line x1="0" y1="100%" x2="100%" y2="0" stroke="rgba(100, 116, 139, 0.4)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                    <path d={generateSvgPath()} fill="none" stroke="#06b6d4" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                </svg>
                {points.map((p, index) => (
                    <div
                        key={p.id}
                        className={`absolute w-2 h-2 -ml-1 -mt-1 border rounded-full cursor-grab active:cursor-grabbing z-20 transition-transform hover:scale-125 ${
                            draggingPointId === p.id ? 'bg-white border-cyber-primary shadow-[0_0_6px_white]' : 'bg-cyber-black border-cyber-primary hover:bg-cyber-primary shadow-md'
                        }`}
                        style={{ left: `${(p.x / 255) * 100}%`, top: `${100 - (p.y / 255) * 100}%` }}
                        onMouseDown={(e) => { e.stopPropagation(); setDraggingPointId(p.id); }}
                        onDoubleClick={(e) => { e.stopPropagation(); if (index !== 0 && index !== points.length - 1) removePoint(p.id); }}
                    ></div>
                ))}
            </div>
            <div className="mt-1.5 text-[7px] text-cyber-dim/50 font-mono uppercase text-center tracking-tighter">
                <MousePointer2 size={7} className="inline mr-1" /> Click to add • Double-click to remove
            </div>
        </div>

        {/* Action Panel */}
        <div className="bg-cyber-black/40 border border-cyber-border p-3 flex flex-col gap-2 shrink-0 rounded-sm">
             <div className="flex justify-between text-[8px] font-mono text-cyber-dim uppercase tracking-widest border-b border-cyber-border/20 pb-1.5">
                 <span>Processor</span>
                 <span className="text-cyber-text font-bold">{files.length} ITEMS</span>
             </div>

             <button
                onClick={applyBatch}
                disabled={isProcessing || files.length === 0}
                className="w-full py-2 bg-cyber-primary/5 border border-cyber-primary text-cyber-primary font-bold text-[9px] uppercase tracking-[0.2em] hover:bg-cyber-primary/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-20 disabled:cursor-not-allowed group shadow-lg"
             >
                {isProcessing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} className="group-hover:rotate-180 transition-transform duration-500" />}
                {isProcessing ? 'CALIBRATING...' : 'EXECUTE'}
             </button>
             
             {completedCount > 0 && !isProcessing && (
                <button
                    onClick={downloadZip}
                    className="w-full py-2 bg-cyber-accent/5 border border-cyber-accent text-cyber-accent font-bold text-[9px] uppercase tracking-[0.2em] hover:bg-cyber-accent/20 transition-all flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300 shadow-lg"
                >
                    <Download size={10} />
                    EXPORT ZIP ({completedCount})
                </button>
             )}
        </div>

        {/* Status Indicator */}
        <div className="flex-1 bg-cyber-dark/20 border border-cyber-border/20 p-1.5 rounded-sm flex flex-col justify-center items-center gap-1 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
             <div className="text-[6px] font-mono uppercase tracking-[0.4em] text-cyber-dim">Local Buffer</div>
             <div className="text-[8px] font-mono text-emerald-500 flex items-center gap-1">
                <div className="w-0.5 h-0.5 bg-emerald-500 rounded-full animate-pulse"></div>
                ENCRYPTED ACTIVE
             </div>
        </div>
      </div>
    </main>
  );
};

export default CurvesAdjustmentView;