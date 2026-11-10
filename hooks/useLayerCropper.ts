
import { useState, useCallback, useEffect } from 'react';
import { LayerImage, CropperConfig } from '../types';
import { generateId, getZip } from '../utils/common';
import { getImageDimensions } from '../utils/imageHelper';

// Define a base box boundary for the preview area
export const WORKSPACE_PREVIEW_MAX_SIZE = 400;

export const useLayerCropper = () => {
  const [layers, setLayers] = useState<LayerImage[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [config, setConfig] = useState<CropperConfig>(() => {
    const defaultConfig: CropperConfig = {
      outputWidth: 1024,
      outputHeight: 1024,
      lockRatio: true,
      quality: 0.9,
      fillColor: '#000000',
    };
    const saved = localStorage.getItem('batchbox_cropper_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Handle migration from previous outputSize
        const outputWidth = parsed.outputWidth || parsed.outputSize || 1024;
        const outputHeight = parsed.outputHeight || parsed.outputSize || 1024;
        return { 
          ...defaultConfig, 
          ...parsed,
          outputWidth,
          outputHeight
        };
      } catch (e) {}
    }
    return defaultConfig;
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    localStorage.setItem('batchbox_cropper_config', JSON.stringify(config));
  }, [config]);

  // Compute preview dimensions fitting within WORKSPACE_PREVIEW_MAX_SIZE
  const { previewWidth, previewHeight } = (() => {
    const w = Math.max(1, config.outputWidth || 1024);
    const h = Math.max(1, config.outputHeight || 1024);
    if (w >= h) {
      const pw = WORKSPACE_PREVIEW_MAX_SIZE;
      const ph = Math.round((h / w) * WORKSPACE_PREVIEW_MAX_SIZE);
      return { previewWidth: pw, previewHeight: ph };
    } else {
      const ph = WORKSPACE_PREVIEW_MAX_SIZE;
      const pw = Math.round((w / h) * WORKSPACE_PREVIEW_MAX_SIZE);
      return { previewWidth: pw, previewHeight: ph };
    }
  })();

  const activeLayer = layers.find(l => l.id === activeLayerId) || null;

  const handleFilesAdded = useCallback(async (files: File[]) => {
    const newLayersPromises = files.map(async (file) => {
      const { width, height } = await getImageDimensions(file);
      
      // Default: Scale to cover the preview area
      const initialScale = Math.max(previewWidth / width, previewHeight / height);
      
      return {
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        x: 0,
        y: 0,
        scale: initialScale,
        width: width,
        height: height,
        originalWidth: width,
        originalHeight: height,
      } as LayerImage;
    });

    const newLayers = await Promise.all(newLayersPromises);
    setLayers(prev => [...prev, ...newLayers]);
    if (!activeLayerId && newLayers.length > 0) {
      setActiveLayerId(newLayers[0].id);
    }
  }, [activeLayerId, previewWidth, previewHeight]);

  const updateActiveLayer = useCallback((updates: Partial<LayerImage>) => {
    if (!activeLayerId) return;
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, ...updates } : l));
  }, [activeLayerId]);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const filtered = prev.filter(l => l.id !== id);
      if (activeLayerId === id) {
        setActiveLayerId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [activeLayerId]);

  const exportAll = async () => {
    if (layers.length === 0) return;
    setIsExporting(true);
    
    try {
      const zip = getZip();
      const targetWidth = Math.max(1, config.outputWidth || 1024);
      const targetHeight = Math.max(1, config.outputHeight || 1024);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;

      // Calculate multiplier from preview size to target size
      const multiplierX = targetWidth / previewWidth;
      const multiplierY = targetHeight / previewHeight;
      // Since preview maintains aspect ratio with targetWidth/targetHeight, multiplierX === multiplierY
      const multiplier = multiplierX;

      for (const layer of layers) {
        // Reset canvas for each image
        ctx.fillStyle = config.fillColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = await new Promise<HTMLImageElement>((resolve) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.src = layer.previewUrl;
        });

        ctx.save();
        // Move to the center of the export canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Scale coordinates & dimensions by multiplier
        const exportScale = layer.scale * multiplier;
        const exportX = layer.x * multiplier;
        const exportY = layer.y * multiplier;
        
        const drawWidth = layer.originalWidth * exportScale;
        const drawHeight = layer.originalHeight * exportScale;
        
        // Draw image using scaled coordinates and dimensions
        ctx.drawImage(
          img, 
          exportX - drawWidth / 2, 
          exportY - drawHeight / 2, 
          drawWidth, 
          drawHeight
        );
        ctx.restore();

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', config.quality));
        if (blob) {
          zip.file(`${layer.file.name.replace(/\.[^/.]+$/, "")}_${targetWidth}x${targetHeight}.jpg`, blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BatchBox_Cropped_${targetWidth}x${targetHeight}_${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    layers,
    activeLayer,
    activeLayerId,
    setActiveLayerId,
    config,
    setConfig,
    previewWidth,
    previewHeight,
    handleFilesAdded,
    updateActiveLayer,
    removeLayer,
    exportAll,
    isExporting
  };
};
