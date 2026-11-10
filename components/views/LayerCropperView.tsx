import React, { useRef, useState, useEffect } from 'react';
import { useLayerCropper } from '../../hooks/useLayerCropper';
import { Layers, Maximize, Move, Trash2, Download, RefreshCw, ZoomIn, ZoomOut, Target, Link as LinkIcon, Unlink } from 'lucide-react';
import Dropzone from '../Dropzone';

interface LayerCropperViewProps {
  controller: ReturnType<typeof useLayerCropper>;
}

// Preset aspect ratios requested: 1:1, 4:3, 3:4, 3:2, 2:3
const PRESET_RATIOS = [
  { label: '1:1', w: 1024, h: 1024 },
  { label: '4:3', w: 1200, h: 900 },
  { label: '3:4', w: 900, h: 1200 },
  { label: '3:2', w: 1200, h: 800 },
  { label: '2:3', w: 800, h: 1200 },
];

const LayerCropperView: React.FC<LayerCropperViewProps> = ({ controller }) => {
  const {
    layers,
    activeLayer,
    activeLayerId,
    setActiveLayerId,
    config,
    setConfig,
    previewWidth,
    previewHeight,
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
  }, [activeLayerId, controller.activeLayer?.scale, controller.updateActiveLayer]);

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

  // Fit image completely inside the preview area (no cropping)
  const autoFit = () => {
    if (!activeLayer) return;
    const scale = Math.min(
      previewWidth / activeLayer.originalWidth,
      previewHeight / activeLayer.originalHeight
    );
    updateActiveLayer({ x: 0, y: 0, scale: Math.max(0.01, scale) });
  };

  // Fill image to cover the entire preview area (no empty border)
  const autoFill = () => {
    if (!activeLayer) return;
    const scale = Math.max(
      previewWidth / activeLayer.originalWidth,
      previewHeight / activeLayer.originalHeight
    );
    updateActiveLayer({ x: 0, y: 0, scale: Math.max(0.01, scale) });
  };

  // Dimension input handlers
  const handleWidthChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val) || val <= 0) {
      setConfig({ ...config, outputWidth: 0 });
      return;
    }
    if (config.lockRatio && config.outputWidth > 0 && config.outputHeight > 0) {
      const ratio = config.outputHeight / config.outputWidth;
      const newHeight = Math.max(1, Math.round(val * ratio));
      setConfig({ ...config, outputWidth: val, outputHeight: newHeight });
    } else {
      setConfig({ ...config, outputWidth: val });
    }
  };

  const handleHeightChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val) || val <= 0) {
      setConfig({ ...config, outputHeight: 0 });
      return;
    }
    if (config.lockRatio && config.outputWidth > 0 && config.outputHeight > 0) {
      const ratio = config.outputWidth / config.outputHeight;
      const newWidth = Math.max(1, Math.round(val * ratio));
      setConfig({ ...config, outputWidth: newWidth, outputHeight: val });
    } else {
      setConfig({ ...config, outputHeight: val });
    }
  };

  const applyPreset = (presetW: number, presetH: number) => {
    setConfig({
      ...config,
      outputWidth: presetW,
      outputHeight: presetH,
      lockRatio: true
    });
  };

  // Detect which preset is currently active
  const activePreset = PRESET_RATIOS.find(
    p => Math.abs((p.w / p.h) - ((config.outputWidth || 1) / (config.outputHeight || 1))) < 0.005
  );

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Left Column: Main Workspace Area */}
      <div className="lg:col-span-9 flex flex-col gap-4 order-2 lg:order-1">
        {layers.length === 0 ? (
          <div className="flex-1 border-2 border-dashed border-cyber-border rounded-xl flex items-center justify-center p-12 bg-cyber-black/20 min-h-[400px]">
            <div className="max-w-md w-full">
              <Dropzone onFilesAdded={handleFilesAdded} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 bg-cyber-dark/80 border border-cyber-border rounded-xl relative overflow-hidden flex items-center justify-center min-h-[500px] lg:min-h-[600px] shadow-inner select-none p-4">
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                 <button onClick={autoFit} className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-primary transition-colors rounded shadow-lg" title="Fit to Frame (完全適配不裁切)">
                   <Maximize size={18} />
                 </button>
                 <button onClick={autoFill} className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-accent transition-colors rounded shadow-lg" title="Fill Frame (填滿畫面不留黑邊)">
                   <Move size={18} />
                 </button>
                 <button onClick={() => updateActiveLayer({x:0, y:0})} className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-emerald-400 transition-colors rounded shadow-lg" title="Center (座標置中)">
                   <Target size={18} />
                 </button>
              </div>

              <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                 <button 
                   onClick={() => activeLayer && updateActiveLayer({scale: activeLayer.scale * 1.1})}
                   className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-primary rounded shadow-lg"
                   title="Zoom In"
                 >
                   <ZoomIn size={18} />
                 </button>
                 <button 
                   onClick={() => activeLayer && updateActiveLayer({scale: activeLayer.scale / 1.1})}
                   className="p-2 bg-cyber-black/80 border border-cyber-border text-cyber-text hover:text-cyber-primary rounded shadow-lg"
                   title="Zoom Out"
                 >
                   <ZoomOut size={18} />
                 </button>
              </div>

              {/* Dynamic Aspect Ratio Mask Container with Dimmed Overflow */}
              <div 
                ref={maskRef}
                className="relative flex items-center justify-center cursor-crosshair select-none"
                style={{
                  width: '100%',
                  height: '100%',
                }}
                onMouseDown={onMouseDown}
              >
                {/* 1. Underlying Dimmed Full Image (Overflowing Part with Dark/Dim effect) */}
                {activeLayer && (
                  <div 
                    className="absolute cursor-move origin-center pointer-events-none opacity-25 brightness-75"
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
                      className="w-full h-full object-contain" 
                      alt="" 
                    />
                    {/* Outline showing the full bounds of the image */}
                    <div className="absolute inset-0 border border-cyber-dim/40 border-dashed"></div>
                  </div>
                )}

                {/* 2. Crop Frame Container (Full Brightness, Clipped Inside) */}
                <div
                  style={{
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                    backgroundColor: config.fillColor || '#000000',
                  }}
                  className="border-2 border-cyber-primary shadow-[0_0_35px_rgba(6,182,212,0.3)] relative overflow-hidden flex-shrink-0 transition-[width,height] duration-200 z-10"
                >
                {/* Checkboard pattern for transparent guidance */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#888_25%,transparent_25%),linear-gradient(-45deg,#888_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#888_75%),linear-gradient(-45deg,transparent_75%,#888_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] pointer-events-none"></div>
                
                {/* 3x3 Grid Guidelines for compositional framing */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                  <div className="border-r border-b border-cyber-primary/40"></div>
                  <div className="border-r border-b border-cyber-primary/40"></div>
                  <div className="border-b border-cyber-primary/40"></div>
                  <div className="border-r border-b border-cyber-primary/40"></div>
                  <div className="border-r border-b border-cyber-primary/40"></div>
                  <div className="border-b border-cyber-primary/40"></div>
                  <div className="border-r border-cyber-primary/40"></div>
                  <div className="border-r border-cyber-primary/40"></div>
                  <div></div>
                </div>

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
                  </div>
                )}
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyber-dim bg-cyber-black/70 px-4 py-1.5 rounded-full border border-cyber-border/40 backdrop-blur-sm shadow-md flex items-center gap-2">
                <span>DRAG TO POSITION</span>
                <span className="text-cyber-border">•</span>
                <span>MOUSE WHEEL TO ZOOM</span>
                <span className="text-cyber-border">•</span>
                <span className="text-cyber-primary font-bold">{config.outputWidth} × {config.outputHeight} px</span>
              </div>
            </div>

            <div className="h-20 flex-shrink-0">
               <Dropzone onFilesAdded={handleFilesAdded} compact={true} />
            </div>
          </>
        )}
      </div>

      {/* Right Column: Sidebar - Control & Layers */}
      <div className="lg:col-span-3 space-y-4 flex flex-col h-fit lg:max-h-[calc(100vh-250px)] lg:sticky lg:top-8 order-1 lg:order-2">
        {/* Output Config Panel */}
        <div className="bg-cyber-panel/40 border border-cyber-border p-4 rounded-lg flex-shrink-0 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-cyber-border/30 pb-2">
            <h2 className="text-xs font-bold text-cyber-primary uppercase tracking-widest flex items-center gap-2 font-mono">
              <Maximize size={14} /> Output Frame
            </h2>
            <span className="text-[9px] font-mono text-cyber-dim">
              {config.outputWidth && config.outputHeight 
                ? `${config.outputWidth}×${config.outputHeight}` 
                : 'Custom'}
            </span>
          </div>

          <div className="space-y-4">
            {/* Aspect Ratio Preset Buttons: 1:1, 4:3, 3:4, 3:2, 2:3 */}
            <div>
              <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-wider block mb-1.5 font-mono">
                Ratio Presets (比例預設)
              </label>
              <div className="grid grid-cols-5 gap-1">
                {PRESET_RATIOS.map(p => {
                  const isSelected = activePreset?.label === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.w, p.h)}
                      className={`py-1.5 text-[10px] font-mono rounded border transition-all ${
                        isSelected
                          ? 'bg-cyber-primary/20 border-cyber-primary text-cyber-primary font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-cyber-black/60 border-cyber-border text-cyber-dim hover:text-cyber-text hover:border-cyber-primary/40'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Output Resolution: Width x Height */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-wider font-mono">
                  Target Size (輸出解析度)
                </label>
                {/* Lock Aspect Ratio Toggle */}
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, lockRatio: !config.lockRatio })}
                  className={`flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    config.lockRatio 
                      ? 'bg-cyber-primary/10 border-cyber-primary/50 text-cyber-primary' 
                      : 'bg-cyber-black/40 border-cyber-border text-cyber-dim hover:text-cyber-text'
                  }`}
                  title={config.lockRatio ? 'Ratio Locked (等比連動)' : 'Free Size (自由設定)'}
                >
                  {config.lockRatio ? <LinkIcon size={9} /> : <Unlink size={9} />}
                  <span>{config.lockRatio ? 'LOCKED' : 'FREE'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-mono text-cyber-dim uppercase">W</span>
                  <input
                    type="number"
                    value={config.outputWidth || ''}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    placeholder="寬"
                    className="w-full bg-cyber-black border border-cyber-border text-cyber-text text-xs pl-6 pr-2 py-1.5 rounded focus:border-cyber-primary outline-none font-mono"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-mono text-cyber-dim uppercase">H</span>
                  <input
                    type="number"
                    value={config.outputHeight || ''}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    placeholder="高"
                    className="w-full bg-cyber-black border border-cyber-border text-cyber-text text-xs pl-6 pr-2 py-1.5 rounded focus:border-cyber-primary outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Background Fill Color (Matte) */}
            <div>
              <label className="text-[9px] font-bold text-cyber-dim uppercase tracking-wider block mb-1.5 font-mono">
                Matte (邊框底色)
              </label>
              <div className="flex items-center gap-2 bg-cyber-black p-1.5 border border-cyber-border rounded">
                <input 
                  type="color" 
                  value={config.fillColor}
                  onChange={(e) => setConfig({ ...config, fillColor: e.target.value })}
                  className="h-6 w-6 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden"
                />
                <span className="text-[10px] font-mono text-cyber-text">{config.fillColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Export Action */}
            <div className="pt-2 border-t border-cyber-border/30">
              <button
                onClick={exportAll}
                disabled={isExporting || layers.length === 0 || !config.outputWidth || !config.outputHeight}
                className="w-full py-2.5 bg-cyber-primary/10 border border-cyber-primary text-cyber-primary font-bold text-xs uppercase tracking-widest hover:bg-cyber-primary/20 transition-all flex items-center justify-center gap-2 rounded disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                <span>EXPORT ZIP</span>
              </button>
            </div>
          </div>
        </div>

        {/* Layer List Container */}
        <div className="flex-1 bg-cyber-panel/20 border border-cyber-border rounded-lg flex flex-col overflow-hidden min-h-[250px] max-h-[400px] lg:max-h-none shadow-inner">
          <div className="p-3 border-b border-cyber-border/50 bg-cyber-black/40 flex justify-between items-center flex-shrink-0">
            <span className="text-[10px] font-bold text-cyber-dim uppercase tracking-widest font-mono">Layers [{layers.length}]</span>
            <Layers size={14} className="text-cyber-dim" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-cyber-black/10">
            {layers.length === 0 && (
              <div className="text-center py-10 text-cyber-dim/30 italic text-sm font-mono">No images imported</div>
            )}
            {layers.map(layer => (
              <div 
                key={layer.id}
                onClick={() => setActiveLayerId(layer.id)}
                className={`group p-2 border transition-all cursor-pointer flex items-center gap-3 relative rounded ${
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
                  <p className="text-[8px] text-cyber-dim font-mono">{layer.originalWidth}×{layer.originalHeight}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                  title="Remove layer"
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