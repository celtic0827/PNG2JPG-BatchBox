import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useImageCurves } from '../../hooks/useImageCurves';
import { Activity, Download, RefreshCw, Trash2, RotateCcw, Image as ImageIcon, Plus, XCircle, Split, MousePointer2 } from 'lucide-react';
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
    isProcessing,
    activePreviewId,
    setActivePreviewId,
    handleFilesAdded,
    handleRemoveFile,
    addPoint,
    updatePoint,
    removePoint,
    resetCurves,
    applyBatch,
    downloadZip,
    lut,
    // AB Mode
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

  // Generate preview whenever LUT or active file changes
  useEffect(() => {
    const activeFile = files.find(f => f.id === activePreviewId);
    if (!activeFile) {
        setPreviewBlobUrl(null);
        return;
    }

    const timer = setTimeout(async () => {
        try {
            const blob = await applyCurvesToImage(activeFile.file, lut);
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
  }, [activePreviewId, lut, files]); 

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
    <main className="max-h-[800px] grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
      
      {/* Left Strip: Vertical Thumbnail Sidebar */}
      <div className="lg:col-span-1 hidden lg:flex flex-col bg-cyber-black border border-cyber-border overflow-hidden">
        <div className="p-2 border-b border-cyber-border bg-cyber-dark text-[10px] font-mono text-cyber-dim uppercase text-center tracking-tighter">
          Manifest
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
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
                className="absolute top-0 right-0 bg-red-600 text-white p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
              >
                <Trash2 size={8} />
              </button>
            </div>
          ))}
          <div className="w-full aspect-square">
            <Dropzone onFilesAdded={handleFilesAdded} compact={true} />
          </div>
        </div>
      </div>

      {/* Center Section: Header + Main Preview Area */}
      <div className="lg:col-span-7 flex flex-col h-full bg-cyber-dark/95 border border-cyber-border rounded-none overflow-hidden">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="w-full max-w-md">
                <Dropzone onFilesAdded={handleFilesAdded} />
             </div>
             <p className="mt-6 font-mono text-sm tracking-[0.3em] uppercase text-cyber-dim/40">Drop base images</p>
          </div>
        ) : (
          <>
            {/* Header / Toolbar */}
            <div className="bg-cyber-black border-b border-cyber-border px-4 py-2 flex items-center justify-between z-20 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsABMode(!isABMode)}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all border ${
                    isABMode 
                    ? 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary' 
                    : 'bg-cyber-panel border-cyber-border text-cyber-dim hover:text-cyber-text'
                  }`}
                >
                  <Split size={12} />
                  {isABMode ? 'AB On' : 'AB Off'}
                </button>

                <div className="h-4 w-px bg-cyber-border/50"></div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-cyber-panel border border-cyber-border px-2 py-1 rounded text-[10px] font-mono text-cyber-dim hover:text-cyber-text transition-all flex items-center gap-2 hover:border-cyber-primary">
                    <ImageIcon size={12} />
                    {referenceImage ? 'Change Ref' : 'Upload Ref'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleReferenceInputChange} />
                  </label>
                  
                  {referenceImage && (
                    <button 
                      onClick={clearReference}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Clear Reference"
                    >
                      <XCircle size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[10px] font-mono text-cyber-dim uppercase">
                {isABMode ? (referenceImage ? 'Reference vs Adjusted' : 'Original vs Adjusted') : 'Visualizing Results'}
              </div>
            </div>

            {/* Main Preview Area */}
            <div 
              ref={previewContainerRef}
              className="flex-1 relative overflow-hidden flex items-center justify-center bg-cyber-black select-none"
            >
                {activeFileItem ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                        <div className="relative border border-cyber-border/50 max-h-full max-w-full overflow-hidden group/preview">
                            
                            {/* Adjusted Version */}
                            <img 
                                src={previewBlobUrl || activeFileItem.previewUrl} 
                                className="max-w-full block"
                                style={{ maxHeight: 'calc(800px - 150px)', objectFit: 'contain' }}
                                alt="Adjusted" 
                            />

                            {/* AB Split */}
                            {isABMode && (
                              <>
                                <div 
                                  className="absolute top-0 left-0 h-full overflow-hidden border-r border-cyber-primary z-10 pointer-events-none"
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
                                  className="absolute top-0 bottom-0 z-20 w-[1px] bg-cyber-primary cursor-col-resize group/handle flex items-center justify-center"
                                  style={{ left: `calc(${splitPosition}% - 0.5px)` }}
                                  onMouseDown={(e) => { e.preventDefault(); setIsResizingSplit(true); }}
                                >
                                   <div className="w-6 h-6 bg-cyber-primary text-cyber-black rounded-none flex items-center justify-center border border-cyber-black">
                                      <Split size={10} className="rotate-90" />
                                   </div>
                                </div>
                              </>
                            )}
                        </div>
                        
                        <div className="mt-2 text-[10px] font-mono text-cyber-dim bg-cyber-black px-2 py-1 border border-cyber-border">
                             {activeFileItem.file.name.toUpperCase()} ({activeFileItem.width}x{activeFileItem.height})
                        </div>
                    </div>
                ) : (
                    <div className="text-cyber-dim font-mono text-xs">Select target from manifest</div>
                )}
            </div>
          </>
        )}
      </div>

      {/* Right Column: Curve Editor */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden h-full">
        <div className="bg-cyber-panel border border-cyber-border p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-cyber-text flex items-center gap-2 font-mono uppercase tracking-widest">
                    <Activity size={14} className="text-cyber-primary" />
                    Master Curve
                </h2>
                <button 
                    onClick={resetCurves}
                    className="text-[9px] font-mono text-cyber-dim hover:text-cyber-primary transition-colors border border-cyber-border px-2 py-0.5 bg-cyber-black"
                >
                    <RotateCcw size={10} className="inline mr-1" /> RESET
                </button>
            </div>

            <div className="aspect-square relative bg-cyber-black border border-cyber-border select-none cursor-crosshair overflow-hidden shrink-0" ref={graphRef} onClick={handleGraphClick}>
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-5">
                    {[...Array(16)].map((_, i) => <div key={i} className="border border-cyber-dim"></div>)}
                </div>
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                    <path d={generateSvgPath()} fill="none" stroke="#06b6d4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
                {points.map((p, index) => (
                    <div
                        key={p.id}
                        className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 border cursor-grab active:cursor-grabbing z-20 ${
                            draggingPointId === p.id ? 'bg-cyber-text border-cyber-primary' : 'bg-cyber-black border-cyber-primary hover:bg-cyber-primary'
                        }`}
                        style={{ left: `${(p.x / 255) * 100}%`, top: `${100 - (p.y / 255) * 100}%` }}
                        onMouseDown={(e) => { e.stopPropagation(); setDraggingPointId(p.id); }}
                        onDoubleClick={(e) => { e.stopPropagation(); if (index !== 0 && index !== points.length - 1) removePoint(p.id); }}
                    ></div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[9px] text-cyber-dim font-mono uppercase">
                <span>0-255 RGB Map</span>
                <span>Drag to map</span>
            </div>
        </div>

        <div className="bg-cyber-black/40 border border-cyber-border p-4 flex flex-col gap-3 shrink-0">
             <div className="flex justify-between text-[10px] font-mono text-cyber-dim uppercase">
                 <span>Batch Queue</span>
                 <span className="text-cyber-text">{files.length} ITEMS</span>
             </div>

             <button
                onClick={applyBatch}
                disabled={isProcessing || files.length === 0}
                className="w-full py-2.5 bg-cyber-primary/5 border border-cyber-primary text-cyber-primary font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-cyber-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
             >
                {isProcessing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {isProcessing ? 'PROCESSING' : 'APPLY BATCH'}
             </button>
             
             {completedCount > 0 && !isProcessing && (
                <button
                    onClick={downloadZip}
                    className="w-full py-2.5 bg-cyber-accent/5 border border-cyber-accent text-cyber-accent font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-cyber-accent/20 transition-all flex items-center justify-center gap-2"
                >
                    <Download size={12} />
                    EXPORT ZIP ({completedCount})
                </button>
             )}
        </div>
      </div>
    </main>
  );
};

export default CurvesAdjustmentView;