import { useState, useCallback, useMemo, useEffect } from 'react';
import { ImageFile, ConversionStatus, ConversionConfig } from '../types';
import { convertImageToJpg, getImageDimensions } from '../utils/imageHelper';
import { generateId, getZip } from '../utils/common';

export const useImageConverter = () => {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<ConversionConfig>(() => {
    const defaultConfig: ConversionConfig = {
      quality: 0.9,
      fillColor: '#FFFFFF',
      scale: 1,
      filenameSuffix: '',
      lockAspectRatio: true,
    };
    const saved = localStorage.getItem('batchbox_converter_config');
    if (saved) {
      try {
        return { ...defaultConfig, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaultConfig;
  });
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('batchbox_converter_config', JSON.stringify(config));
  }, [config]);

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
    setFiles(prev => {
      const updated = [...prev, ...newImageFiles];
      if (prev.length === 0 && updated.length > 0) {
        setConfig(c => ({
          ...c,
          targetWidth: updated[0].width,
          targetHeight: updated[0].height,
          lockAspectRatio: true
        }));
      }
      return updated;
    });
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
    setConfig(c => ({ ...c, scale: 1, targetWidth: undefined, targetHeight: undefined, filenameSuffix: '', lockAspectRatio: true }));
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
        const suffix = config.filenameSuffix || '';
        const fileName = f.file.name.replace(/\.(png|jpe?g|webp)$/i, '') + suffix + '.jpg';
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

  const stats = useMemo(() => {
    const completed = files.filter(f => f.status === ConversionStatus.COMPLETED).length;
    const total = files.length;
    const totalConvertedSize = files.reduce((acc, curr) => acc + (curr.convertedSize || 0), 0);
    return { completed, total, totalConvertedSize };
  }, [files]);

  return {
    files,
    isProcessing,
    config,
    setConfig,
    processedCount,
    stats,
    handleFilesAdded,
    handleRemoveFile,
    handleClearAll,
    startConversion,
    downloadZip
  };
};
