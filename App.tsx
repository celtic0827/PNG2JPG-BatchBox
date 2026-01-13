import React, { useState } from 'react';
import { Package, ShieldCheck, FolderArchive, Image as ImageIcon, Crop, Activity } from 'lucide-react';
import { useImageConverter } from './hooks/useImageConverter';
import { useBatchZipper } from './hooks/useBatchZipper';
import { useLayerCropper } from './hooks/useLayerCropper';
import { useImageCurves } from './hooks/useImageCurves';
import ImageConverterView from './components/views/ImageConverterView';
import BatchZipperView from './components/views/BatchZipperView';
import LayerCropperView from './components/views/LayerCropperView';
import CurvesAdjustmentView from './components/views/CurvesAdjustmentView';

type ActiveTab = 'converter' | 'zipper' | 'cropper' | 'curves';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('curves'); 
  
  const imageConverterController = useImageConverter();
  const batchZipperController = useBatchZipper();
  const layerCropperController = useLayerCropper();
  const imageCurvesController = useImageCurves();

  return (
    <div className="min-h-screen w-full relative flex flex-col overflow-hidden">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern bg-[length:40px_40px] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto w-full px-4 pt-2 flex flex-col gap-2 flex-1">
        
        {/* Header - Reduced height by ~30% */}
        <header className="flex flex-row items-center justify-between border-b border-cyber-border/30 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-cyber-dark border border-cyber-primary text-cyber-primary p-1.5 shadow-[0_0_8px_rgba(6,182,212,0.1)]">
              <Package size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter flex items-center leading-none">
                <span className="text-cyber-primary mr-1.5 drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">BATCH</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-primary via-cyan-400 to-cyber-accent">
                  BOX
                </span>
              </h1>
              <p className="text-[8px] text-cyber-dim font-mono tracking-[0.2em] uppercase leading-none mt-0.5">Local Signal Processor</p>
            </div>
          </div>
          
          <div className="hidden sm:flex gap-1.5 text-[9px] font-mono text-cyber-primary bg-cyber-dark/60 px-2.5 py-1 border border-cyber-primary/10 backdrop-blur-sm">
            <ShieldCheck size={10} />
            <span>ENCRYPTED LOCAL ENV</span>
          </div>
        </header>

        {/* Tabs - Reduced padding */}
        <div className="flex gap-3 border-b border-cyber-border/10 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0">
          <button 
            onClick={() => setActiveTab('converter')}
            className={`pb-1.5 px-1 flex items-center gap-1.5 font-mono text-[10px] tracking-wider transition-all relative ${
              activeTab === 'converter' ? 'text-cyber-primary' : 'text-cyber-dim hover:text-cyber-text'
            }`}
          >
            <ImageIcon size={12} /> CONVERTER
            {activeTab === 'converter' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-primary shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('cropper')}
            className={`pb-1.5 px-1 flex items-center gap-1.5 font-mono text-[10px] tracking-wider transition-all relative ${
              activeTab === 'cropper' ? 'text-cyber-primary' : 'text-cyber-dim hover:text-cyber-text'
            }`}
          >
            <Crop size={12} /> CROPPER
            {activeTab === 'cropper' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-primary shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('curves')}
            className={`pb-1.5 px-1 flex items-center gap-1.5 font-mono text-[10px] tracking-wider transition-all relative ${
              activeTab === 'curves' ? 'text-cyber-primary' : 'text-cyber-dim hover:text-cyber-text'
            }`}
          >
            <Activity size={12} /> BATCH CURVES
            {activeTab === 'curves' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-primary shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
            )}
          </button>

          <button 
             onClick={() => setActiveTab('zipper')}
             className={`pb-1.5 px-1 flex items-center gap-1.5 font-mono text-[10px] tracking-wider transition-all relative ${
              activeTab === 'zipper' ? 'text-cyber-accent' : 'text-cyber-dim hover:text-cyber-text'
            }`}
          >
            <FolderArchive size={12} /> ZIPPER
            {activeTab === 'zipper' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-accent shadow-[0_0_8px_rgba(217,70,239,0.5)]"></span>
            )}
          </button>
        </div>

        {/* View Rendering */}
        <div className="flex-1 min-h-0 pb-4">
          {activeTab === 'converter' && <ImageConverterView controller={imageConverterController} />}
          {activeTab === 'cropper' && <LayerCropperView controller={layerCropperController} />}
          {activeTab === 'curves' && <CurvesAdjustmentView controller={imageCurvesController} />}
          {activeTab === 'zipper' && <BatchZipperView controller={batchZipperController} />}
        </div>

      </div>
    </div>
  );
};

export default App;