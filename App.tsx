import React, { useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { ImageFile, ConversionStatus, ConversionConfig } from './types';
import { convertPngToJpg, formatBytes } from './utils/imageHelper';
import Dropzone from './components/Dropzone';
import FileItem from './components/FileItem';
import { Settings, Download, RefreshCw, Trash2, Cpu, FileImage, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<ConversionConfig>({
    quality: 0.9,
    fillColor: '#FFFFFF',
  });
  const [processedCount, setProcessedCount] = useState(0);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const newImageFiles: ImageFile[] = newFiles.map(file => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: ConversionStatus.IDLE,
      originalSize: file.size,
    }));
    setFiles(prev => [...prev, ...newImageFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setProcessedCount(0);
  }, [files]);

  const startConversion = async () => {
    setIsProcessing(true);
    setProcessedCount(0);

    const filesToProcess = files.filter(f => f.status !== ConversionStatus.COMPLETED);
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const currentId = filesToProcess[i].id;
      
      // Update status to processing
      setFiles(prev => prev.map(f => f.id === currentId ? { ...f, status: ConversionStatus.PROCESSING } : f));

      try {
        const jpgBlob = await convertPngToJpg(filesToProcess[i].file, config);
        
        setFiles(prev => prev.map(f => 
          f.id === currentId ? { 
            ...f, 
            status: ConversionStatus.COMPLETED, 
            convertedBlob: jpgBlob,
            convertedSize: jpgBlob.size 
          } : f
        ));
        setProcessedCount(prev => prev + 1);
      } catch (error) {
        console.error("Conversion failed", error);
        setFiles(prev => prev.map(f => 
          f.id === currentId ? { ...f, status: ConversionStatus.ERROR, errorMessage: 'Failed' } : f
        ));
      }
    }
    
    setIsProcessing(false);
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    // Removed folder creation to keep files at root
    
    const completedFiles = files.filter(f => f.status === ConversionStatus.COMPLETED && f.convertedBlob);
    
    if (completedFiles.length === 0) return;

    completedFiles.forEach(f => {
      // Change extension from .png to .jpg
      const fileName = f.file.name.replace(/\.png$/i, '') + '.jpg';
      if (f.convertedBlob) {
        zip.file(fileName, f.convertedBlob);
      }
    });

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converted_images_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ZIP generation failed", error);
      alert("Failed to generate ZIP");
    }
  };

  const stats = useMemo(() => {
    const completed = files.filter(f => f.status === ConversionStatus.COMPLETED).length;
    const total = files.length;
    const totalConvertedSize = files.reduce((acc, curr) => acc + (curr.convertedSize || 0), 0);
    return { completed, total, totalConvertedSize };
  }, [files]);

  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8 min-h-screen pb-24">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-cyber-border pb-6">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3 tracking-tighter">
            <div className="bg-cyber-dark border border-cyber-primary text-cyber-primary p-2.5 rounded-none shadow-neon">
              <Cpu size={32} />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-primary to-cyber-accent">
              PNG2JPG
            </span>
            <span className="text-cyber-dim text-xl font-mono mt-2">v1.0</span>
          </h1>
          <p className="text-cyber-dim mt-2 font-mono text-sm tracking-wide">
            >> SYSTEM STATUS: ONLINE // CLIENT-SIDE PROCESSING
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2 text-xs font-mono text-cyber-primary bg-cyber-primary/10 px-3 py-1 rounded border border-cyber-primary/30">
            <ShieldCheck size={14} />
            <span>SECURE • LOCAL • PRIVATE</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left Column: Settings + Compact Dropzone (if files exist) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-cyber-panel/50 backdrop-blur-md rounded-xl border border-cyber-border p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-cyber-text mb-6 flex items-center gap-2 font-mono uppercase border-b border-cyber-border pb-2">
              <Settings size={18} className="text-cyber-primary" />
              Configuration
            </h2>
            
            <div className="space-y-8">
              {/* Quality Slider */}
              <div className="group">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-cyber-dim uppercase tracking-wider">
                    Compression Quality
                  </label>
                  <span className="text-sm font-mono text-cyber-primary">
                    {Math.round(config.quality * 100)}%
                  </span>
                </div>
                <div className="relative w-full h-2 bg-cyber-dark rounded-full overflow-hidden border border-cyber-border">
                  <div 
                    className="absolute h-full bg-cyber-primary/50" 
                    style={{width: `${config.quality * 100}%`}}
                  />
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={config.quality * 100}
                    onChange={(e) => setConfig({...config, quality: Number(e.target.value) / 100})}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-cyber-dim mb-2 uppercase tracking-wider">
                  Fill Background
                </label>
                <div className="flex items-center gap-3 bg-cyber-dark p-2 rounded border border-cyber-border">
                  <input 
                    type="color" 
                    value={config.fillColor}
                    onChange={(e) => setConfig({...config, fillColor: e.target.value})}
                    className="h-8 w-8 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden"
                    disabled={isProcessing}
                  />
                  <span className="text-sm font-mono text-cyber-text flex-1">
                    {config.fillColor.toUpperCase()}
                  </span>
                  <div className="text-xs text-cyber-dim">RGB</div>
                </div>
                <p className="text-xs text-cyber-dim mt-2">
                  Replaces PNG transparency.
                </p>
              </div>

              <div className="border-t border-cyber-border pt-6 space-y-4">
                <button
                  onClick={startConversion}
                  disabled={isProcessing || files.length === 0 || stats.completed === files.length}
                  className={`
                    w-full py-4 px-4 rounded-none skew-x-[-2deg] flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all
                    ${isProcessing 
                      ? 'bg-cyber-dark text-cyber-dim border border-cyber-border cursor-wait' 
                      : (files.length === 0 || stats.completed === files.length) 
                        ? 'bg-cyber-dark text-cyber-dim border border-cyber-border opacity-50'
                        : 'bg-cyber-primary text-cyber-black hover:bg-cyber-primaryHover hover:shadow-neon border border-cyber-primary'
                    }
                  `}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={20} />
                      PROCESSING ({processedCount}/{files.length})
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} />
                      INITIATE CONVERSION
                    </>
                  )}
                </button>

               {stats.completed > 0 && !isProcessing && (
                <button
                  onClick={downloadZip}
                  className="w-full py-4 px-4 rounded-none skew-x-[-2deg] flex items-center justify-center gap-3 font-bold uppercase tracking-widest bg-cyber-accent hover:bg-fuchsia-400 text-white shadow-lg hover:shadow-neon-accent transition-all border border-cyber-accent"
                >
                  <Download size={20} />
                  DOWNLOAD ARCHIVE
                </button>
              )}
              </div>
            </div>
          </div>

          {/* Conditional Dropzone: Appears here when files exist */}
          {files.length > 0 && (
             <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} compact={true} />
          )}
        </div>

        {/* Right Column: Dropzone (Initial) OR List (Files Exist) */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
          
          {/* Initial State: Large Dropzone */}
          {files.length === 0 && (
            <div className="h-full flex flex-col">
              <Dropzone onFilesAdded={handleFilesAdded} disabled={isProcessing} />
              
              <div className="flex-1 mt-6 flex flex-col items-center justify-center text-cyber-dim opacity-30 border-2 border-dashed border-cyber-border rounded-xl bg-cyber-black/20">
                 <FileImage size={64} strokeWidth={0.5} />
                 <p className="mt-4 font-mono text-sm tracking-[0.2em] uppercase">No Data Loaded</p>
              </div>
            </div>
          )}
          
          {/* Files State: List takes over right column */}
          {files.length > 0 && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1 border-b border-cyber-border/50 pb-2">
                <h3 className="font-bold text-cyber-text uppercase tracking-wider text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyber-primary rounded-full animate-pulse"></span>
                  Operation Log <span className="text-cyber-dim">({files.length})</span>
                </h3>
                {!isProcessing && (
                  <button 
                    onClick={handleClearAll}
                    className="text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={12} /> PURGE LIST
                  </button>
                )}
              </div>

              <div className="bg-cyber-panel/30 border border-cyber-border rounded-xl flex-1 overflow-hidden flex flex-col relative backdrop-blur-sm">
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {files.map((file) => (
                    <FileItem 
                      key={file.id} 
                      item={file} 
                      onRemove={isProcessing ? () => {} : handleRemoveFile} 
                    />
                  ))}
                </div>
                
                {/* Summary Footer */}
                <div className="bg-cyber-dark/80 border-t border-cyber-border p-3 px-6 text-sm text-cyber-dim flex justify-between items-center backdrop-blur font-mono">
                  <span>
                    PROGRESS: <span className="text-cyber-primary">{stats.completed}</span> / {files.length}
                  </span>
                  {stats.totalConvertedSize > 0 && (
                    <span className="hidden sm:inline-block text-xs text-cyber-text bg-cyber-panel px-2 py-1 rounded border border-cyber-border">
                      OUTPUT SIZE: {formatBytes(stats.totalConvertedSize)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;