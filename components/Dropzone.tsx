import React, { useCallback, useState } from 'react';
import { UploadCloud, AlertCircle, Plus } from 'lucide-react';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded, disabled, compact = false }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateAndAddFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const validFiles: File[] = [];
    let hasInvalid = false;

    Array.from(fileList).forEach(file => {
      if (file.type === 'image/png') {
        validFiles.push(file);
      } else {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      setError('Only PNG files are supported.');
      setTimeout(() => setError(null), 3000);
    }

    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    
    validateAndAddFiles(e.dataTransfer.files);
  }, [disabled, onFilesAdded]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    validateAndAddFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out text-center cursor-pointer group
          ${compact ? 'p-4' : 'p-10'}
          ${isDragActive 
            ? 'border-cyber-primary bg-cyber-primary/10 shadow-neon scale-[1.01]' 
            : 'border-cyber-border hover:border-cyber-primary/50 hover:bg-cyber-dark hover:shadow-lg bg-cyber-black/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : ''}
        `}
      >
        <input
          type="file"
          multiple
          accept="image/png"
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className={`flex flex-col items-center justify-center pointer-events-none ${compact ? 'gap-2' : 'space-y-4'}`}>
          <div className={`
            rounded-full transition-colors duration-300 flex items-center justify-center
            ${compact ? 'p-2' : 'p-4'}
            ${isDragActive ? 'bg-cyber-primary text-cyber-black' : 'bg-cyber-panel text-cyber-primary group-hover:text-cyan-300'}
          `}>
            {compact ? (
              <Plus size={24} strokeWidth={2} />
            ) : (
              <UploadCloud size={48} strokeWidth={1.5} />
            )}
          </div>
          <div>
            <h3 className={`font-bold text-cyber-text tracking-wide group-hover:text-cyber-primary transition-colors ${compact ? 'text-sm' : 'text-xl'}`}>
              {compact ? 'ADD MORE IMAGES' : 'DROP PNG FILES'}
            </h3>
            {!compact && (
              <p className="text-cyber-dim mt-2 text-sm font-mono uppercase tracking-wider">
                Or Click to Browse • Multiple Select
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-red-400 bg-red-900/80 border border-red-700/50 px-4 py-2 rounded-full text-sm animate-bounce shadow-lg z-20 w-max max-w-[90%]">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dropzone;