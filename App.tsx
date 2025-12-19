
import React, { useState } from 'react';
import { Package, ShieldCheck, FolderArchive, Image as ImageIcon, Crop } from 'lucide-react';
import { useImageConverter } from './hooks/useImageConverter';
import { useBatchZipper } from './hooks/useBatchZipper';
import { useLayerCropper } from './hooks/useLayerCropper';
import ImageConverterView from './components/views/ImageConverterView';
import BatchZipperView from './components/views/BatchZipperView';
import LayerCropperView from './components/views/LayerCropperView';

type ActiveTab = 'converter' | 'zipper' | 'cropper';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('converter');
  
  // Lift state to App level using hooks so state persists when switching tabs
  const imageConverterController = useImageConverter();
  const batchZipperController = useBatchZipper();
  const layerCropperController = useLayerCropper();

  return (
    <div className="min-h-screen w-full relative">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern bg-[length:40px_40px] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6 pb-32">
        
        {/* Header - Consistent Styling */}
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-cyber-border/60 pb-8 bg-gradient-to-r from-transparent via-cyber-panel/10 to-transparent">
          <div>
            <div className="flex items-center gap-4">
              <div className="bg-cyber-dark border border-cyber-primary text-cyber-primary p-3 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyber-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Package size={36} strokeWidth={1.5} className="relative z-10" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter flex items-center leading-none">
                  <span className="text-cyber-primary mr-2 block sm:inline mb-1 sm:mb-0 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">BATCH</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-primary via-cyan-400 to-cyber-accent">
                    BOX
                  </span>
                </h1>
              </div>
            </div>
            <p className="text-cyber-dim mt-3 font-mono text-sm tracking-wide pl-1 border-l-2 border-cyber-primary/30 ml-1">
              LOCAL FILE PROCESSING CONTAINER
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 text-xs font-mono text-cyber-primary bg-cyber-dark/80 px-4 py-2 border border-cyber-primary/20 shadow-sm backdrop-blur-sm">
              <ShieldCheck size={14} />
              <span>LOCAL PROCESSING ENV</span>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-cyber-border/30 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button 
            onClick={() => setActiveTab('converter')}
            className={`pb-3 px-2 flex items-center gap-2 font-mono text-sm tracking-widest transition-all relative ${
              activeTab === 'converter' ? 'text-cyber-primary' : 'text-cyber-dim hover:text-cyber-text'
            }`}
          >
            <ImageIcon size={16} /> IMAGE CONVERTER
            {activeTab === 'converter' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-primary shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('cropper')}
            className={`pb-3 px-2 flex items-center gap-2 font-mono text-sm tracking-widest transition-all relative ${
              activeTab === 'cropper' ? 'text-cyber-primary' : 'text-cyber-dim hover:text-cyber-text'
            }`}
          >
            <Crop size={16} /> SQUARE CROPPER
            {activeTab === 'cropper' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-primary shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
            )}
          </button>

          <button 
             onClick={() => setActiveTab('zipper')}
             className={`pb-3 px-2 flex items-center gap-2 font-mono text-sm tracking-widest transition-all relative ${
              activeTab === 'zipper' ? 'text-cyber-accent' : 'text-cyber-dim hover:text-cyber-text'
            }`}
          >
            <FolderArchive size={16} /> BATCH ZIPPER
            {activeTab === 'zipper' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-accent shadow-[0_0_10px_rgba(217,70,239,0.5)]"></span>
            )}
          </button>
        </div>

        {/* View Rendering */}
        {activeTab === 'converter' && (
          <ImageConverterView controller={imageConverterController} />
        )}

        {activeTab === 'cropper' && (
          <LayerCropperView controller={layerCropperController} />
        )}

        {activeTab === 'zipper' && (
           <BatchZipperView controller={batchZipperController} />
        )}

      </div>
    </div>
  );
};

export default App;
