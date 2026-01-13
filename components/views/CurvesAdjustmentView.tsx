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
  const [isDragOver, setIsDragOver] = useState(false);
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
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Left Column: Image Preview Area + Strip */}
      <div className="lg:col-span-8 flex flex-col gap-4 order-2 lg:order-1 h-auto min-h-0">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col h-full">
             <Dropzone onFilesAdded={handleFilesAdded} />
             <div className="flex-1 mt-6 flex flex-col items-center justify-center text-cyber-dim/40 border-2 border-dashed border-cyber-border/30 rounded-xl bg-cyber-black/20 p-8 min-h-[400px]">
               <Activity size={80} strokeWidth={0.5} className="text-cyber-border" />
               <p className="mt-6 font-mono text-sm tracking-[0.3em] uppercase">No Images Loaded</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-cyber-dark/95 border border-cyber-border rounded-xl overflow-hidden shadow-none relative">
            {/* Header / Toolbar for Preview - Clean style, no glows */}
            <div className="bg-cyber-black border-b border-cyber-border px-4 py-3 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsABMode(!isABMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider transition-all border ${
                    isABMode 
                    ? 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary' 
                    : 'bg-cyber-panel border-cyber-border text-cyber-dim hover:text-cyber-text'
                  }`}
                >
                  <Split size={14} />
                  {isABMode ? 'AB On' : 'AB Off'}
                </button>

                <div className="h-4 w-px bg-cyber-border/50"></div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-cyber-panel border border-cyber-border px-3 py-1.5 rounded text-[11px] font-mono text-cyber-dim hover:text-cyber-text transition-all flex items-center gap-2 hover:border-cyber-primary">
                    <ImageIcon size={14} />
                    {referenceImage ? 'Change Ref' : 'Upload Ref'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleReferenceInputChange} />
                  </label>
                  
                  {referenceImage && (
                    <button 
                      onClick={clearReference}
                      className="text-red-400 hover:text-red-300 p-1.5 transition-colors"
                      title="Clear Reference"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-[10px] font-mono text-cyber-dim uppercase hidden sm:block">
                {isABMode ? (referenceImage ? 'REF vs ADJ' : 'ORIG vs ADJ') : 'Visualizing Results'}
              </div>
            </div>

            {/* Main Preview Area */}
            <div 
              ref={previewContainerRef}
              className="flex-1 relative overflow-hidden flex items-center justify-center bg-cyber-black min-h-[400px]"
            >
                {activeFileItem ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
                        <div className="relative border border-cyber-border/50 max-h-full max-w-full overflow-hidden group/preview select-none">
                            
                            {/* Adjusted Version (Background) */}
                            <img 
                                src={previewBlobUrl || activeFileItem.previewUrl} 
                                className="max-w-full block"
                                style={{ maxHeight: 'min(65vh, 800px)', objectFit: 'contain' }}
                                alt="Adjusted" 
                            />

                            {/* AB Comparison Split */}
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
                                
                                {/* Draggable Split Line - Sharp style, no glow */}
                                <div 
                                  className="absolute top-0 bottom-0 z-20 w-1 bg-cyber-primary cursor-col-resize group/handle flex items-center justify-center"
                                  style={{ left: `calc(${splitPosition}% - 0.5px)` }}
                                  onMouseDown={(e) => { e.preventDefault(); setIsResizingSplit(true); }}
                                >
                                   <div className="w-8 h-8 bg-cyber-primary text-cyber-black rounded-none flex items-center justify-center shadow-none border border-cyber-black">
                                      <Split size={14} className="rotate-90" />
                                   </div>
                                </div>

                                {/* Labels */}
                                <div className="absolute top-3 left-3 z-30 bg-cyber-black/90 text-cyber-accent text-[9px] font-mono px-2 py-1 border border-cyber-accent/40 pointer-events-none">
                                  SIDE A: {referenceImage ? 'REFERENCE' : 'ORIGINAL'}
                                </div>
                                <div className="absolute top-3 right-3 z-30 bg-cyber-black/90 text-cyber-primary text-[9px] font-mono px-2 py-1 border border-cyber-primary/40 pointer-events-none">
                                  SIDE B: ADJUSTED
                                </div>
                              </>
                            )}

                            {!isABMode && (
                              <div className="absolute top-3 right-3 bg-cyber-black/90 text-cyber-primary text-[10px] font-mono px-2 py-1 border border-cyber-primary/40 pointer-events-none uppercase">
                                Adjusted View
                              </div>
                            )}
                        </div>
                        
                        <div className="mt-4 bg-cyber-black/60 border border-cyber-border px-4 py-2 flex items-center gap-6 text-[11px] font-mono text-cyber-dim">
                             <div className="flex items-center gap-2">
                                <ImageIcon size={12} />
                                <span className="truncate max-w-[200px]" title={activeFileItem.file.name}>{activeFileItem.file.name}</span>
                             </div>
                             <div className="text-cyber-text">
                                {activeFileItem.width}x{activeFileItem.height}
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-cyber-dim font-mono text-sm">Select an image to preview</div>
                )}
            </div>
            
            {/* File Strip - Tighter strip, no glows */}
            <div className="h-20 bg-cyber-black border-t border-cyber-border p-2 flex gap-2 overflow-x-auto custom-scrollbar items-center">
                {files.map(file => (
                    <div 
                        key={file.id} 
                        onClick={() => setActivePreviewId(file.id)}
                        className={`
                            relative w-14 h-14 flex-shrink-0 cursor-pointer border rounded-sm overflow-hidden transition-all group/item
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
                            <Trash2 size={10} />
                        </button>
                    </div>
                ))}
                
                <div className="w-14 h-14 flex-shrink-0">
                     <Dropzone onFilesAdded={handleFilesAdded} compact={true} />
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Curve Editor - Solid, clean UI */}
      <div className="lg:col-span-4 space-y-6 order-1 lg:order-2 flex flex-col h-fit sticky top-8">
        <div className="bg-cyber-panel border border-cyber-border p-6 shadow-none rounded-none relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-md font-bold text-cyber-text flex items-center gap-2 font-mono uppercase tracking-widest">
                    <Activity size={18} className="text-cyber-primary" />
                    Master Curve
                </h2>
                <button 
                    onClick={resetCurves}
                    className="text-[10px] font-mono text-cyber-dim hover:text-cyber-primary transition-colors border border-cyber-border px-2 py-1 bg-cyber-black"
                >
                    <RotateCcw size={10} className="inline mr-1" /> RESET
                </button>
            </div>

            {/* Curve Graph - No glows, sharp lines */}
            <div className="aspect-square relative bg-cyber-black border border-cyber-border select-none cursor-crosshair overflow-hidden" ref={graphRef} onClick={handleGraphClick}>
                {/* Grid */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-10">
                    {[...Array(16)].map((_, i) => <div key={i} className="border border-cyber-dim/40"></div>)}
                </div>
                
                {/* Diagonal Reference */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-5" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="100" x2="100" y2="0" stroke="white" strokeWidth="1" />
                </svg>

                {/* Main Curve Path */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                    <path 
                        d={generateSvgPath()} 
                        fill="none" 
                        stroke="#06b6d4" 
                        strokeWidth="2" 
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>

                {/* Interactive Points */}
                {points.map((p, index) => (
                    <div
                        key={p.id}
                        className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 border cursor-grab active:cursor-grabbing transition-transform z-20 ${
                            draggingPointId === p.id 
                            ? 'bg-cyber-text border-cyber-primary scale-125' 
                            : 'bg-cyber-black border-cyber-primary hover:bg-cyber-primary'
                        }`}
                        style={{
                            left: `${(p.x / 255) * 100}%`,
                            top: `${100 - (p.y / 255) * 100}%`
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingPointId(p.id);
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (index !== 0 && index !== points.length - 1) {
                                removePoint(p.id);
                            }
                        }}
                    ></div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-[10px] text-cyber-dim font-mono uppercase tracking-tighter">
                <span className="flex items-center gap-1"><MousePointer2 size={10} /> Double-click point to delete</span>
                <span>0-255 RGB Mapping</span>
            </div>
        </div>

        {/* Action Panel */}
        <div className="bg-cyber-black/40 border border-cyber-border p-4 space-y-3">
             <div className="flex justify-between text-[11px] font-mono text-cyber-dim uppercase">
                 <span>Batch Queue</span>
                 <span className="text-cyber-text">{files.length} IMAGES</span>
             </div>

             <button
                onClick={applyBatch}
                disabled={isProcessing || files.length === 0}
                className="w-full py-3 bg-cyber-primary/5 border border-cyber-primary text-cyber-primary font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-cyber-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
             >
                {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isProcessing ? 'PROCESSING' : 'APPLY BATCH'}
             </button>
             
             {completedCount > 0 && !isProcessing && (
                <button
                    onClick={downloadZip}
                    className="w-full py-3 bg-cyber-accent/5 border border-cyber-accent text-cyber-accent font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-cyber-accent/20 transition-all flex items-center justify-center gap-2"
                >
                    <Download size={14} />
                    DOWNLOAD ZIP ({completedCount})
                </button>
             )}
        </div>
      </div>
    </main>
  );
};

export default CurvesAdjustmentView;