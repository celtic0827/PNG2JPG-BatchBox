import { useState, useCallback, useMemo } from 'react';
import { ZipTask, ConversionStatus } from '../types';
import { generateId, getZip } from '../utils/common';

export const useBatchZipper = () => {
  const [zipTasks, setZipTasks] = useState<ZipTask[]>([]);
  const [isZipping, setIsZipping] = useState(false);

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
      totalSize: folderGroups[folderName].reduce((acc, f) => acc + f.size, 0),
      progress: 0
    }));

    setZipTasks(prev => [...prev, ...newTasks]);
  }, []);

  const handleRemoveZipTask = useCallback((id: string) => {
    setZipTasks(prev => {
      // Clean up logic if needed in future
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
      setZipTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: ConversionStatus.PROCESSING, progress: 0 } : t));

      try {
        const zip = getZip();
        
        task.files.forEach(file => {
          const pathParts = file.webkitRelativePath.split('/');
          const relativePath = pathParts.slice(1).join('/');
          
          if (relativePath) {
             zip.file(relativePath, file);
          } else {
             zip.file(file.name, file);
          }
        });

        const content = await zip.generateAsync({ 
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 } 
        }, (metadata: { percent: number }) => {
            setZipTasks(prev => prev.map(t => 
                t.id === task.id ? { ...t, progress: metadata.percent } : t
            ));
        });
        
        setZipTasks(prev => prev.map(t => 
          t.id === task.id ? { 
            ...t, 
            status: ConversionStatus.COMPLETED, 
            zipBlob: content,
            zipSize: content.size,
            progress: 100
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

  const stats = useMemo(() => {
     const completed = zipTasks.filter(t => t.status === ConversionStatus.COMPLETED).length;
     return { completed, total: zipTasks.length };
  }, [zipTasks]);

  return {
    zipTasks,
    isZipping,
    stats,
    handleFoldersAdded,
    handleRemoveZipTask,
    handleClearZipTasks,
    startBatchZipping,
    downloadOneZip,
    downloadAllZips
  };
};