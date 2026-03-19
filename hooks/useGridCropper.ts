import { useState, useCallback, useEffect } from 'react';
import { GridCropperConfig } from '../types';
import { getZip } from '../utils/common';
import { cropImageToGrid, getImageDimensions } from '../utils/imageHelper';

export const useGridCropper = () => {
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [config, setConfig] = useState<GridCropperConfig>(() => {
    const saved = localStorage.getItem('batchbox_grid_cropper_config');
    const defaultConfig = {
      rows: 2,
      cols: 3,
      avatarWidth: 512,
      avatarHeight: 512,
      cropScale: 1.0,
      quality: 0.9,
      exportName: 'avatar',
      startNumber: 1,
    };
    if (saved) {
      try {
        return { ...defaultConfig, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem('batchbox_grid_cropper_config', JSON.stringify(config));
  }, [config]);

  // Update preview when sourceFiles or currentIndex changes
  useEffect(() => {
    const updatePreview = async () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      const file = sourceFiles[currentIndex];
      if (file) {
        const url = URL.createObjectURL(file);
        const dims = await getImageDimensions(file);
        setPreviewUrl(url);
        setDimensions(dims);
      } else {
        setPreviewUrl(null);
        setDimensions({ width: 0, height: 0 });
      }
    };
    updatePreview();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [sourceFiles, currentIndex]);

  const handleFilesAdded = useCallback((files: File[]) => {
    setSourceFiles(prev => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSourceFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1);
      }
      return next;
    });
  }, [currentIndex]);

  const clearSource = useCallback(() => {
    setSourceFiles([]);
    setCurrentIndex(0);
  }, []);

  const exportGrid = async () => {
    if (sourceFiles.length === 0) return;
    setIsProcessing(true);
    try {
      const zip = getZip();
      let currentGlobalNumber = config.startNumber;

      for (const file of sourceFiles) {
        const blobs = await cropImageToGrid(
          file,
          config.rows,
          config.cols,
          config.avatarWidth,
          config.avatarHeight,
          config.cropScale,
          config.quality
        );

        blobs.forEach((blob) => {
          const fileName = `${config.exportName}_${currentGlobalNumber.toString().padStart(3, '0')}.jpg`;
          zip.file(fileName, blob);
          currentGlobalNumber++;
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.exportName}_batch_grid_export.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Grid export failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    sourceFiles,
    currentIndex,
    setCurrentIndex,
    previewUrl,
    dimensions,
    config,
    setConfig,
    isProcessing,
    handleFilesAdded,
    removeFile,
    clearSource,
    exportGrid
  };
};
