import React from 'react';
import { Archive, FolderArchive, RefreshCw, Download, Trash2, Folder, ArrowRight } from 'lucide-react';
import Dropzone from '../Dropzone';
import { formatBytes } from '../../utils/imageHelper';
import { useBatchZipper } from '../../hooks/useBatchZipper';
import { ConversionStatus } from '../../types';

interface BatchZipperViewProps {
  controller: ReturnType<typeof useBatchZipper>;
}

const BatchZipperView: React.FC<BatchZipperViewProps> = ({ controller }) => {
  const {
    zipTasks,
    isZipping,
    stats,
    handleFoldersAdded,
    handleRemoveZipTask,
    handleClearZipTasks,
    startBatchZipping,
    downloadOneZip,
    downloadAllZips
  } = controller;

  return (
   <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
     
     {/* Left Column: Folder List (Moved from right) */}
     <div className="lg:col-span-8 flex flex-col h-full min-h-[500px] order-2 lg:order-1">
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
                        {task.status === ConversionStatus.PROCESSING && (
                          <div className="flex flex-col items-end gap-1 min-w-[100px]">
                             <div className="flex items-center gap-2">
                               <span className="text-cyber-accent text-xs animate-pulse font-mono">{Math.floor(task.progress || 0)}%</span>
                             </div>
                             <div className="w-24 h-1.5 bg-cyber-dark rounded-full overflow-hidden border border-cyber-border/50">
                                <div 
                                  className="h-full bg-cyber-accent transition-all duration-300 ease-out"
                                  style={{ width: `${task.progress || 0}%` }}
                                />
                             </div>
                          </div>
                        )}
                        
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

     {/* Right Column: Actions (Moved from left) */}
     <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
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
              disabled={isZipping || zipTasks.length === 0 || stats.completed === zipTasks.length}
              className={`
                w-full py-4 px-4 relative group overflow-hidden transition-all
                ${isZipping || zipTasks.length === 0 || stats.completed === zipTasks.length
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

            {stats.completed > 0 && (
              <button
                onClick={downloadAllZips}
                className="w-full py-4 px-4 relative overflow-hidden group bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]"
              >
                 <div className="absolute inset-0 w-1 bg-emerald-500 transition-all duration-300 group-hover:w-full opacity-10"></div>
                <div className="flex items-center justify-center gap-3 font-bold uppercase tracking-widest relative z-10">
                  <Download size={18} />
                  <span className="text-sm">Download All ({stats.completed})</span>
                </div>
              </button>
            )}
         </div>
       </div>

       {zipTasks.length > 0 && <Dropzone onFilesAdded={handleFoldersAdded} disabled={isZipping} compact={true} mode="folder" />}
     </div>

   </main>
  );
};

export default BatchZipperView;