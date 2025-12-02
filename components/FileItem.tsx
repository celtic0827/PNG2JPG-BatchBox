import React, { memo } from 'react';
import { ImageFile, ConversionStatus } from '../types';
import { Trash2, CheckCircle2, Loader2, AlertTriangle, FileImage } from 'lucide-react';
import { formatBytes } from '../utils/imageHelper';

interface FileItemProps {
  item: ImageFile;
  onRemove: (id: string) => void;
}

const FileItem: React.FC<FileItemProps> = memo(({ item, onRemove }) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case ConversionStatus.COMPLETED:
        return <CheckCircle2 className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" size={20} />;
      case ConversionStatus.PROCESSING:
        return <Loader2 className="text-cyber-primary animate-spin" size={20} />;
      case ConversionStatus.ERROR:
        return <AlertTriangle className="text-red-500" size={20} />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-cyber-border" />;
    }
  };

  const getStatusText = () => {
     switch (item.status) {
      case ConversionStatus.COMPLETED:
        return <span className="text-emerald-400 font-mono text-xs tracking-widest uppercase">Done</span>;
      case ConversionStatus.PROCESSING:
        return <span className="text-cyber-primary font-mono text-xs tracking-widest uppercase animate-pulse">Converting...</span>;
      case ConversionStatus.ERROR:
        return <span className="text-red-500 font-mono text-xs tracking-widest uppercase">Failed</span>;
      default:
        return <span className="text-cyber-dim font-mono text-xs tracking-widest uppercase">Pending</span>;
    }
  };

  return (
    <div className="group bg-cyber-black/60 border border-cyber-border hover:border-cyber-primary/30 rounded-lg p-3 flex items-center gap-4 hover:shadow-lg hover:shadow-cyber-primary/5 transition-all duration-300 backdrop-blur-sm">
      {/* Thumbnail */}
      <div className="w-12 h-12 flex-shrink-0 bg-cyber-dark rounded overflow-hidden border border-cyber-border relative group-hover:border-cyber-primary/40 transition-colors">
         {item.previewUrl ? (
           <img 
             src={item.previewUrl} 
             alt="preview" 
             className="w-full h-full object-cover" 
           />
         ) : (
           <div className="w-full h-full flex items-center justify-center text-cyber-dim">
             <FileImage size={24} />
           </div>
         )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
           <h4 className="font-medium text-cyber-text truncate max-w-[200px] sm:max-w-md font-mono text-sm" title={item.file.name}>
            {item.file.name}
          </h4>
        </div>
        <div className="text-xs text-cyber-dim flex items-center gap-2 mt-1 font-mono">
          <span>{formatBytes(item.originalSize)}</span>
          {item.convertedSize && (
            <>
              <span className="text-cyber-primary">→</span>
              <span className="text-cyber-text font-bold">{formatBytes(item.convertedSize)}</span>
              <span className="text-emerald-500">
                ({Math.round(((item.convertedSize - item.originalSize) / item.originalSize) * 100)}%)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="hidden sm:flex items-center gap-2 min-w-[100px] justify-end">
        {getStatusText()}
      </div>

      {/* Action */}
      <div className="flex items-center gap-3 pl-2 border-l border-cyber-border/50">
        {getStatusIcon()}
        {item.status === ConversionStatus.IDLE && (
          <button 
            onClick={() => onRemove(item.id)}
            className="text-cyber-dim hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
});

export default FileItem;