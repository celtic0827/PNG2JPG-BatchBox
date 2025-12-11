import React, { useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { ImageFile, ConversionStatus, ConversionConfig, ZipTask } from './types';
import { convertImageToJpg, formatBytes, getImageDimensions } from './utils/imageHelper';
import Dropzone from './components/Dropzone';
import FileItem from './components/FileItem';
import { Settings, Download, RefreshCw, Trash2, Package, ShieldCheck, Layers, Box, Minimize2, Scissors, FolderArchive, ArrowRight, Folder, Archive, Image as ImageIcon } from 'lucide-react';

// Robust JSZip initialization for different ESM environments
const getZip = () => {
  if (typeof JSZip === 'function') {
    return new JSZip();
  } else if ((JSZip as any).default && typeof (JSZip as any).default === 'function') {
    return new (JSZip as any).default();
  }
  throw new Error("JSZip could not be initialized");
};

type ActiveTab = 'converter' | 'zipper';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('converter');
  
  // --- Image Converter State ---
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<ConversionConfig>({
    quality: 0.9,
    fillColor: '#FFFFFF',
    scale: 1,
    trimRight: 0,
  });
  const [processedCount, setProcessedCount] = useState(0);

  // --- Batch Zip State ---
  const [zipTasks, setZipTasks] = useState<ZipTask[]>([]);
  const [isZipping, setIsZipping] = useState(false);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // ==========================================
  // Image Converter Logic
  // ==========================================

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    const processedFilesPromises = newFiles.map(async (file) => {
      const dimensions = await getImageDimensions(file);
      return {
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: ConversionStatus.IDLE,
        originalSize: file.size,
        width: dimensions.width,
        height: dimensions.height,
      } as ImageFile;
    });

    const newImageFiles = await Promise.all(processedFilesPromises);
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
      setFiles(prev => prev.map(f => f.id === currentId ? { ...f, status: ConversionStatus.PROCESSING } : f));

      try {
        const jpgBlob = await convertImageToJpg(filesToProcess[i].file, config);
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
    try {
      const zip = getZip();
      const completedFiles = files.filter(f => f.status === ConversionStatus.COMPLETED && f.convertedBlob);
      if (completedFiles.length === 0) return;

      completedFiles.forEach(f => {
        const fileName = f.file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg';
        if (f.convertedBlob) {
          zip.file(fileName, f.convertedBlob);
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BatchBox_Images_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ZIP generation failed", error);
      alert("Failed to generate ZIP.");
    }
  };

  const converterStats = useMemo(() => {
    const completed = files.filter(f => f.status === ConversionStatus.COMPLETED).length;
    const total = files.length;
    const totalConvertedSize = files.reduce((acc, curr) => acc + (curr.convertedSize || 0), 0);
    return { completed, total, totalConvertedSize };
  }, [files]);


  // ==========================================
  // Batch Zipper Logic
  // ==========================================

  const handleFoldersAdded = useCallback((newFiles: File[]) => {
    // Group files by top-level folder
    const folderGroups: Record<string, File[]> = {};
    const rootFiles: File[] = [];

    newFiles.forEach(file => {
      // webkitRelativePath usually looks like "FolderA/sub/file.txt"
      const pathParts = file.webkitRelativePath.split('/');
      
      if (pathParts.length > 1) {
        const rootFolder = pathParts[0];
        if (!folderGroups[rootFolder]) {
          folderGroups[rootFolder] = [];
        }
        folderGroups[rootFolder].push(file);
      } else {
        // Files dropped directly without a folder (or browser doesn't support path)
        rootFiles.push(file);
      }
    });

    const newTasks: ZipTask[] = Object.keys(folderGroups).map(folderName => ({
      id: generateId(),
      folderName,
      files: folderGroups[folderName],
      status: ConversionStatus.IDLE,
      totalSize: folderGroups[folderName].reduce((acc, f) => acc + f.size, 0)
    }));
    
    // Optional: Handle root files if necessary, currently we focus on folders as requested
    // If you wanted to bundle stray files into a "Root" zip, you could add logic here.

    setZipTasks(prev => [...prev, ...newTasks]);
  }, []);

  const handleRemoveZipTask = useCallback((id: string) => {
    setZipTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (target && target.zipBlob) {
         // revoke logic if needed, but blob urls are usually created on download
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const handleClearZipTasks = useCallback(() => {
    setZipTasks([]);
  }, []);

  const startBatchZipping = async () => {
    setIsZipping(true);
    
    const tasksToProcess = zipTasks.filter(t => t.status !== ConversionStatus.COMPLETED);

    for (const task of tasksToProcess) {
      // Update status to processing
      setZipTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: ConversionStatus.PROCESSING } : t));

      try {
        const zip = getZip();
        
        // Add files to zip, preserving structure relative to the root folder
        task.files.forEach(file => {
          // file.webkitRelativePath is "FolderA/sub/file.txt"
          // We want the zip to contain "sub/file.txt" (or should it contain "FolderA/sub/..."?)
          // Requirement: "A B C 3個目錄 會打包成 A.zip B.zip C.zip"
          // Usually, A.zip should contain the contents of A.
          // If we want the folder A inside the zip, we keep the full path.
          // If we want the contents at root of zip, we strip the first part.
          // Let's assume typical behavior: A.zip contains "file.txt", not "A/file.txt", 
          // OR it contains "A/file.txt". 
          // Let's go with keeping the folder structure tidy: Remove the top level name from path.
          
          const pathParts = file.webkitRelativePath.split('/');
          // Remove the first part (Folder Name)
          const relativePath = pathParts.slice(1).join('/');
          
          if (relativePath) {
             zip.file(relativePath, file);
          } else {
             // Should not happen if filtered correctly, but just in case
             zip.file(file.name, file);
          }
        });

        const content = await zip.generateAsync({ type: "blob" });
        
        setZipTasks(prev => prev.map(t => 
          t.id === task.id ? { 
            ...t, 
            status: ConversionStatus.COMPLETED, 
            zipBlob: content,
            zipSize: content.size
          } : t
        ));

      } catch (error) {
        console.error("Zipping failed", error);
        setZipTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, status: ConversionStatus.ERROR } : t
        ));
      }
    }

    setIsZipping(false);
  };

  const downloadOneZip = (task: ZipTask) => {
    if (!task.zipBlob) return;
    const url = URL.createObjectURL(task.zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllZips = () => {
     zipTasks.forEach(task => {
        if (task.status === ConversionStatus.COMPLETED) {
           downloadOneZip(task);
        }
     });
  };

  const zipStats = useMemo(() => {
     const completed = zipTasks.filter(t => t.status === ConversionStatus.COMPLETED).length;
     return { completed, total: zipTasks.length };
  }, [zipTasks]);

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="min-h-screen w-full relative">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern bg-[length:40px_40px] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6 pb-32">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-cyber-border/60 pb-8 bg-gradient-to-r from-transparent via-cyber-panel/10 to-transparent">
          <div>
            <div className="flex items-center gap-4">
              <div className="bg-cyber-dark border border-cyber-primary text-cyber-primary p-3 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyber-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Package size={36} strokeWidth={1.5} className="relative z-10" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter flex flex-col sm:block leading-none">
                  <span className="text-cyber-dim font-mono text-xl md:text-2xl mr-2 font-normal block sm:inline mb-1 sm:mb-0">BATCH</span>
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
        <div className="flex gap-4 border-b border-cyber-border/30">
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

        {/* ======================= IMAGE CONVERTER VIEW ======================= */}
        {activeTab === 'converter' && (
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

                  {/* Trim */}
                  <div className="group">
                    <div className="flex justify-between mb-3">
                      <label className="text-xs font-bold text-cyber-dim uppercase tracking-widest flex items-center gap-2" title="Crop pixels from the right side">
                         <Scissors size={12} /> Trim Right
                      </label>
                      <span className="text-xs font-mono text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">
                        {config.trimRight} px
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-cyber-black rounded-sm overflow-hidden border border-cyber-border shadow-inner">
                      <div className="absolute h-full bg-gradient-to-r from-orange-400/50 to-orange-400" style={{width: `${(config.trimRight / 50) * 100}%`}} />
                      <input 
                        type="range" min="0" max="50" step="1"
                        value={config.trimRight}
                        onChange={(e) => setConfig({...config, trimRight: Number(e.target.value)})}
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
                      disabled={isProcessing || files.length === 0 || converterStats.completed === files.length}
                      className={`
                        w-full py-4 px-4 relative group overflow-hidden transition-all
                        ${isProcessing || files.length === 0 || converterStats.completed === files.length
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

                   {converterStats.completed > 0 && !isProcessing && (
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
                        <span>COMPLETED: <span className="text-cyber-text">{converterStats.completed}</span></span>
                      </div>
                      {converterStats.totalConvertedSize > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-2 text-cyber-text/80 bg-cyber-panel/50 px-3 py-1 rounded border border-cyber-border/50">
                          <span>NET OUTPUT:</span>
                          <span className="text-cyber-primary font-bold">{formatBytes(converterStats.totalConvertedSize)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        {/* ======================= BATCH ZIPPER VIEW ======================= */}
        {activeTab === 'zipper' && (
           <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             {/* Left Column: Actions */}
             <div className="lg:col-span-4 space-y-6">
               <div className="bg-cyber-panel/40 backdrop-blur-md border border-cyber-border p-6 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-accent to-transparent opacity-50"></div>
                 
                 <h2 className="text-lg font-bold text-cyber-text mb-6 flex items-center gap-3 font-mono uppercase tracking-wide">
                   <Archive size={18} className="text-cyber-accent" />
                   Zip Controls
                 </h2>
                 
                 <div className="space-y-4">
                    <div className="p-4 bg-cyber-black/50 border border-cyber-border/50 rounded text-xs text-cyber-dim leading-relaxed">
                      <strong className="text-cyber-accent block mb-2">HOW IT WORKS:</strong>
                      Drag multiple folders into the dropzone. Each top-level folder will be compressed into its own standalone ZIP file.
                    </div>

                    <button
                      onClick={startBatchZipping}
                      disabled={isZipping || zipTasks.length === 0 || zipStats.completed === zipTasks.length}
                      className={`
                        w-full py-4 px-4 relative group overflow-hidden transition-all
                        ${isZipping || zipTasks.length === 0 || zipStats.completed === zipTasks.length
                          ? 'bg-cyber-dark border border-cyber-border cursor-not-allowed opacity-50' 
                          : 'bg-cyber-accent/10 hover:bg-cyber-accent/20 border border-cyber-accent text-cyber-accent hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]'
                        }
                      `}
                    >
                      <div className="absolute inset-0 w-1 bg-cyber-accent transition-all duration-300 group-hover:w-full opacity-10"></div>
                      <div className="flex items-center justify-center gap-3 font-bold uppercase tracking-widest relative z-10">
                        {isZipping ? <RefreshCw className="animate-spin" size={18} /> : <FolderArchive size={18} />}
                        <span className="text-sm">{isZipping ? `Compressing...` : 'Zip All Folders'}</span>
                      </div>
                    </button>

                    {zipStats.completed > 0 && (
                      <button
                        onClick={downloadAllZips}
                        className="w-full py-4 px-4 relative overflow-hidden group bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]"
                      >
                         <div className="absolute inset-0 w-1 bg-emerald-500 transition-all duration-300 group-hover:w-full opacity-10"></div>
                        <div className="flex items-center justify-center gap-3 font-bold uppercase tracking-widest relative z-10">
                          <Download size={18} />
                          <span className="text-sm">Download All ({zipStats.completed})</span>
                        </div>
                      </button>
                    )}
                 </div>
               </div>

               {zipTasks.length > 0 && <Dropzone onFilesAdded={handleFoldersAdded} disabled={isZipping} compact={true} mode="folder" />}
             </div>

             {/* Right Column: Folder List */}
             <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                {zipTasks.length === 0 ? (
                   <div className="h-full flex flex-col animate-in fade-in duration-500">
                    <Dropzone onFilesAdded={handleFoldersAdded} disabled={isZipping} mode="folder" />
                    <div className="flex-1 mt-6 flex flex-col items-center justify-center text-cyber-dim/40 border-2 border-dashed border-cyber-border/30 rounded-xl bg-cyber-black/20 p-8">
                       <FolderArchive size={80} strokeWidth={0.5} className="text-cyber-border" />
                       <p className="mt-6 font-mono text-sm tracking-[0.3em] uppercase">No Folders Queued</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-4 px-2 border-b border-cyber-border/50 pb-3">
                      <h3 className="font-bold text-cyber-text uppercase tracking-wider text-sm flex items-center gap-3">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-accent opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-accent"></span></span>
                        Zip Manifest <span className="text-cyber-dim font-mono text-xs">[{zipTasks.length}]</span>
                      </h3>
                      {!isZipping && (
                        <button onClick={handleClearZipTasks} className="text-[10px] font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-sm border border-red-500/20 transition-colors flex items-center gap-2 uppercase tracking-wide">
                          <Trash2 size={12} /> Purge All
                        </button>
                      )}
                    </div>

                    <div className="bg-cyber-panel/20 border border-cyber-border rounded-lg flex-1 overflow-hidden flex flex-col relative backdrop-blur-sm shadow-inner">
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-pb-8">
                        {zipTasks.map((task) => (
                           <div key={task.id} className="group bg-cyber-black/60 border border-cyber-border hover:border-cyber-accent/30 rounded-lg p-3 flex items-center gap-4 hover:shadow-lg hover:shadow-cyber-accent/5 transition-all duration-300 backdrop-blur-sm">
                              {/* Icon */}
                              <div className="w-12 h-12 flex-shrink-0 bg-cyber-dark/50 rounded flex items-center justify-center border border-cyber-border text-cyber-accent">
                                <Folder size={24} />
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-cyber-text truncate font-mono text-sm">{task.folderName}</h4>
                                  <span className="text-[10px] bg-cyber-border/30 px-1.5 py-0.5 rounded text-cyber-dim">{task.files.length} files</span>
                                </div>
                                <div className="text-xs text-cyber-dim flex items-center gap-2 mt-1 font-mono">
                                   <span>{formatBytes(task.totalSize)}</span>
                                   {task.zipSize && (
                                     <>
                                      <ArrowRight size={10} className="text-cyber-accent" />
                                      <span className="text-cyber-text font-bold">{formatBytes(task.zipSize)}</span>
                                      <span className="text-emerald-500">.zip</span>
                                     </>
                                   )}
                                </div>
                              </div>

                              {/* Status */}
                              <div className="flex items-center gap-3">
                                {task.status === ConversionStatus.PROCESSING && <span className="text-cyber-accent text-xs animate-pulse">ZIPPING...</span>}
                                {task.status === ConversionStatus.COMPLETED && (
                                  <button onClick={() => downloadOneZip(task)} className="text-emerald-400 hover:text-emerald-300 text-xs font-mono border border-emerald-500/30 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
                                    DOWNLOAD
                                  </button>
                                )}
                                {task.status === ConversionStatus.IDLE && !isZipping && (
                                   <button onClick={() => handleRemoveZipTask(task.id)} className="text-cyber-dim hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors">
                                      <Trash2 size={16} />
                                   </button>
                                )}
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
             </div>

           </main>
        )}

      </div>
    </div>
  );
};

export default App;