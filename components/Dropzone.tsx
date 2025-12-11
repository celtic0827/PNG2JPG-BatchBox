import React, { useCallback, useState } from 'react';
import { UploadCloud, AlertCircle, Plus, FolderArchive, Loader2 } from 'lucide-react';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  mode?: 'image' | 'folder'; // New prop to switch modes
}

const Dropzone: React.FC<DropzoneProps> = ({ 
  onFilesAdded, 
  disabled, 
  compact = false, 
  mode = 'image' 
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
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

  // Helper: Read all entries from a directory reader (handles pagination)
  const readAllEntries = async (dirReader: any): Promise<any[]> => {
    const entries: any[] = [];
    let readResults = await new Promise<any[]>((resolve, reject) => 
      dirReader.readEntries(resolve, reject)
    );
    
    while (readResults.length > 0) {
      entries.push(...readResults);
      readResults = await new Promise<any[]>((resolve, reject) => 
        dirReader.readEntries(resolve, reject)
      );
    }
    return entries;
  };

  // Helper: Recursively traverse FileSystemEntry
  const traverseFileTree = async (entry: any, path: string = ''): Promise<File[]> => {
    if (entry.isFile) {
      return new Promise<File[]>((resolve) => {
        entry.file((file: File) => {
          // Manually patch webkitRelativePath for correct grouping
          // entry.name is the filename, path is the parent structure (e.g. "Parent/Child/")
          const fullPath = path + entry.name;
          Object.defineProperty(file, 'webkitRelativePath', {
            value: fullPath,
            writable: true
          });
          resolve([file]);
        }, () => resolve([])); // Resolve empty on error
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await readAllEntries(dirReader);
      const promises = entries.map(child => traverseFileTree(child, path + entry.name + '/'));
      const results = await Promise.all(promises);
      return results.flat();
    }
    return [];
  };

  const validateAndAddFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    // Convert to array
    const files = Array.from(fileList);
    
    if (mode === 'image') {
      const validFiles: File[] = [];
      let hasInvalid = false;

      files.forEach(file => {
        if (file.type === 'image/png' || file.type === 'image/jpeg') {
          validFiles.push(file);
        } else {
          hasInvalid = true;
        }
      });

      if (hasInvalid) {
        setError('Only PNG and JPG files are supported.');
        setTimeout(() => setError(null), 3000);
      }

      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    } else {
      // Folder mode via Input: Accept everything, validation happens in parent
      onFilesAdded(files);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled || isScanning) return;

    // Advanced handling for Folder Mode using FileSystem API
    if (mode === 'folder') {
       const items = e.dataTransfer.items;
       if (items && items.length > 0) {
          // Check if we can use webkitGetAsEntry (Chrome/Safari/Edge/Firefox)
          const entries = Array.from(items)
             .map(item => typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null)
             .filter(Boolean);

          if (entries.length > 0) {
             setIsScanning(true);
             try {
                const scanPromises = entries.map(entry => traverseFileTree(entry));
                const results = await Promise.all(scanPromises);
                const allFiles = results.flat();
                
                if (allFiles.length > 0) {
                   onFilesAdded(allFiles);
                } else {
                   setError("No files found in dropped folders.");
                   setTimeout(() => setError(null), 3000);
                }
             } catch (err) {
                console.error("Scanning failed", err);
                setError("Failed to scan directory structure.");
                setTimeout(() => setError(null), 3000);
             } finally {
                setIsScanning(false);
             }
             return;
          }
       }
    }
    
    // Fallback standard behavior
    validateAndAddFiles(e.dataTransfer.files);
  }, [disabled, onFilesAdded, mode, isScanning]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    validateAndAddFiles(e.target.files);
    e.target.value = '';
  };

  const title = mode === 'image' 
    ? (compact ? 'ADD MORE IMAGES' : 'DROP PNG / JPG') 
    : (compact ? 'ADD MORE FOLDERS' : 'DROP FOLDERS HERE');
    
  const subTitle = mode === 'image'
    ? 'Or Click to Browse • Multiple Select'
    : 'Drag multiple folders to auto-group';

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
          ${(disabled || isScanning) ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : ''}
        `}
      >
        <input
          type="file"
          multiple
          // Add webkitdirectory for folder selection support in open dialog (Chrome/Edge/Firefox)
          {...(mode === 'folder' ? { webkitdirectory: "", directory: "" } as any : { accept: "image/png, image/jpeg" })}
          onChange={handleFileInput}
          disabled={disabled || isScanning}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className={`flex flex-col items-center justify-center pointer-events-none ${compact ? 'gap-2' : 'space-y-4'}`}>
          <div className={`
            rounded-full transition-colors duration-300 flex items-center justify-center
            ${compact ? 'p-2' : 'p-4'}
            ${isDragActive ? 'bg-cyber-primary text-cyber-black' : 'bg-cyber-panel text-cyber-primary group-hover:text-cyan-300'}
          `}>
            {isScanning ? (
               <Loader2 size={compact ? 24 : 48} className="animate-spin" strokeWidth={1.5} />
            ) : compact ? (
              <Plus size={24} strokeWidth={2} />
            ) : (
              mode === 'image' ? <UploadCloud size={48} strokeWidth={1.5} /> : <FolderArchive size={48} strokeWidth={1.5} />
            )}
          </div>
          <div>
            <h3 className={`font-bold text-cyber-text tracking-wide group-hover:text-cyber-primary transition-colors ${compact ? 'text-sm' : 'text-xl'}`}>
              {isScanning ? 'SCANNING FOLDERS...' : title}
            </h3>
            {!compact && !isScanning && (
              <p className="text-cyber-dim mt-2 text-sm font-mono uppercase tracking-wider">
                {subTitle}
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