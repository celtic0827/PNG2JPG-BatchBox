import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLayerCropper, WORKSPACE_PREVIEW_SIZE } from '../../hooks/useLayerCropper';
import { Layers, Maximize, Move, Trash2, Download, RefreshCw, ZoomIn, ZoomOut, Target } from 'lucide-react';
import Dropzone from '../Dropzone';

interface LayerCropperViewProps {
  controller: ReturnType<typeof useLayerCropper>;
}

const LayerCropperView: React.FC<LayerCropperViewProps> = ({ controller }) => {
  const {
    layers,
    activeLayer,
    activeLayerId,
    setActiveLayerId,
    config,
    setConfig,
    handleFilesAdded,
    updateActiveLayer,
    removeLayer,
    exportAll,
    isExporting
  } = controller;

  const maskRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (!activeLayer) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: activeLayer.x, y: activeLayer.y });
  };

  // Attach non-passive wheel listener to prevent page scroll
  useEffect(() => {
    const mask = maskRef.current;
    if (!mask) return;

    const handleWheel = (e: WheelEvent) => {
      if (!activeLayerId) return;
      // Prevent browser from scrolling the page
      e.preventDefault();

      const zoomSpeed = 0.001;
      const factor = 1 - e.deltaY * zoomSpeed;
      
      controller.updateActiveLayer({
        scale: Math.max(0.01, (controller.activeLayer?.scale || 1) * factor)
      });
    };

    mask.addEventListener('wheel', handleWheel, { passive: false });
    return () => mask.removeEventListener('wheel', handleWheel);
  }, [activeLayerId, controller.activeLayer?.scale]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !activeLayer) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      updateActiveLayer({
        x: initialPos.x + dx,
        y: initialPos.y + dy
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeLayer, dragStart, initialPos, updateActiveLayer]);

  const autoFit = () => {
    if (!activeLayer) return;
    const scale = Math.min(1, WORKSPACE_PREVIEW_SIZE / Math.max(activeLayer.originalWidth, activeLayer.originalHeight));
    updateActiveLayer({ x: 0, y: 0, scale: scale });
  };

  const autoFill = () => {
    if (!activeLayer) return;
    const scale = WORKSPACE_PREVIEW_SIZE / Math.min(activeLayer.originalWidth, activeLayer.originalHeight);
    updateActiveLayer({ x: 0, y: 0, scale: scale });
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Left Column: Main Workspace Area (Moved from right) */}
      <div className="lg:col-span-9 flex flex-col gap-4 order-2 lg:order-1">
        {layers.length === 0 ? (
          <div className="flex-1 border-2 border-dashed border-cyber-border rounded-xl flex items-center justify-center p-12 bg-cyber-black/20 min-h-[400px]">
            <div className="max-w-md w-full">
              <Dropzone onFilesAdded={handleFilesAdded} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 bg-cyber-dark/80 border border-cyber-border rounded-xl relative overflow-hidden flex items-center justify-center min-h-[500px] lg:min-h-[600px] shadow-inner select-none">
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                 <button onClick={autoFit} className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-primary transition-colors rounded shadow-lg" title="Fit to Square">
                   <Maximize size={18} />
                 </button>
                 <button onClick={autoFill} className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-accent transition-colors rounded shadow-lg" title="Fill Square">
                   <Move size={18} />
                 </button>
                 <button onClick={() => updateActiveLayer({x:0, y:0})} className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-emerald-400 transition-colors rounded shadow-lg" title="Center">
                   <Target size={18} />
                 </button>
              </div>

              <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                 <button 
                   onClick={() => activeLayer && updateActiveLayer({scale: activeLayer.scale * 1.1})}
                   className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-primary rounded shadow-lg"
                 >
                   <ZoomIn size={18} />
                 </button>
                 <button 
                   onClick={() => activeLayer && updateActiveLayer({scale: activeLayer.scale / 1.1})}
                   className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-primary rounded shadow-lg"
                 >
                   <ZoomOut size={18} />
                 </button>
              </div>

              {/* Square Mask Container */}
              <div 
                ref={maskRef}
                className="w-[400px] h-[400px] bg-[#111] border-2 border-cyber-primary shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden cursor-crosshair flex-shrink-0"
                onMouseDown={onMouseDown}
              >
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#888_25%,transparent_25%),linear-gradient(-45deg,#888_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#888_75%),linear-gradient(-45deg,transparent_75%,#888_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]"></div>
                
                {activeLayer && (
                  <div 
                    className="absolute cursor-move origin-center"
                    style={{
                      transform: `translate(calc(-50% + ${activeLayer.x}px), calc(-50% + ${activeLayer.y}px))`,
                      top: '50%',
                      left: '50%',
                      width: activeLayer.originalWidth * activeLayer.scale,
                      height: activeLayer.originalHeight * activeLayer.scale
                    }}
                  >
                    <img 
                      src={activeLayer.previewUrl} 
                      className="w-full h-full object-contain pointer-events-none" 
                      alt="" 
                    />
                    <div className="absolute inset-0 border border-cyber-primary/30 pointer-events-none"></div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyber-dim bg-cyber-black/60 px-4 py-2 rounded-full border border-cyber-border/30 backdrop-blur-sm">
                DRAG TO POSITION • MOUSE WHEEL TO ZOOM
              </div>
            </div>

            <div className="h-20 flex-shrink-0">
               <Dropzone onFilesAdded={handleFilesAdded} compact={true} />
            </div>
          </>
        )}
      </div>

      {/* Right Column: Sidebar - Control & Layers (Moved from left) */}
      <div className="lg:col-span-3 space-y-4 flex flex-col h-fit lg:max-h-[calc(100vh-250px)] lg:sticky lg:top-8 order-1 lg:order-2">
        {/* Output Config Panel */}
        <div className="bg-cyber-panel/40 border border-cyber-border p-4 rounded-lg flex-shrink-0">
          <h2 className="text-xs font-bold text-cyber-primary uppercase tracking-widest mb-4 flex items-center gap-2">
            <Maximize size={14} /> Output Config
          </h2>
          <div className="space-y-4">
             <div>
               <label className="text-[10px] text-cyber-dim block mb-1">TARGET RESOLUTION</label>
               <select 
                 value={config.outputSize} 
                 onChange={(e) => setConfig({...config, outputSize: Number(e.target.value)})}
                 className="w-full bg-cyber-black border border-cyber-border text-cyber-text text-sm p-2 rounded focus:border-cyber-primary outline-none cursor-pointer"
               >
                 <option value={512}>512 x 512</option>
                 <option value={1024}>1024 x 1024</option>
                 <option value={2048}>2048 x 2048</option>
               </select>
             </div>
             <button
               onClick={exportAll}
               disabled={isExporting || layers.length === 0}
               className="w-full py-3 bg-cyber-primary/10 border border-cyber-primary text-cyber-primary font-bold text-xs uppercase tracking-widest hover:bg-cyber-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
               EXPORT ZIP
             </button>
          </div>
        </div>

        {/* Layer List Container */}
        <div className="flex-1 bg-cyber-panel/20 border border-cyber-border rounded-lg flex flex-col overflow-hidden min-h-[250px] max-h-[400px] lg:max-h-none shadow-inner">
          <div className="p-3 border-b border-cyber-border/50 bg-cyber-black/40 flex justify-between items-center flex-shrink-0">
            <span className="text-[10px] font-bold text-cyber-dim uppercase tracking-widest">Layers [{layers.length}]</span>
            <Layers size={14} className="text-cyber-dim" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-cyber-black/10">
            {layers.length === 0 && (
              <div className="text-center py-10 text-cyber-dim/30 italic text-sm">No images imported</div>
            )}
            {layers.map(layer => (
              <div 
                key={layer.id}
                onClick={() => setActiveLayerId(layer.id)}
                className={`group p-2 border transition-all cursor-pointer flex items-center gap-3 relative ${
                  activeLayerId === layer.id 
                    ? 'border-cyber-primary bg-cyber-primary/10 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                    : 'border-cyber-border bg-cyber-black/40 hover:border-cyber-dim'
                }`}
              >
                <div className="w-10 h-10 bg-cyber-dark rounded overflow-hidden flex-shrink-0 border border-cyber-border/50">
                  <img src={layer.previewUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-cyber-text truncate font-mono">{layer.file.name}</p>
                  <p className="text-[8px] text-cyber-dim font-mono">{layer.originalWidth}x{layer.originalHeight}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

    </main>
  );
};

export default LayerCropperView;