
import { useState, useCallback } from 'react';
import { LayerImage, CropperConfig } from '../types';
import { generateId, getZip } from '../utils/common';
import { getImageDimensions } from '../utils/imageHelper';

// Define a constant for the preview area size to ensure consistency between UI and Export
export const WORKSPACE_PREVIEW_SIZE = 400;

export const useLayerCropper = () => {
  const [layers, setLayers] = useState<LayerImage[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [config, setConfig] = useState<CropperConfig>({
    outputSize: 1024,
    quality: 0.9,
    fillColor: '#000000',
  });
  const [isExporting, setIsExporting] = useState(false);

  const activeLayer = layers.find(l => l.id === activeLayerId) || null;

  const handleFilesAdded = useCallback(async (files: File[]) => {
    const newLayersPromises = files.map(async (file) => {
      const { width, height } = await getImageDimensions(file);
      
      // Default: Scale to cover the preview square (WORKSPACE_PREVIEW_SIZE)
      const initialScale = WORKSPACE_PREVIEW_SIZE / Math.min(width, height);
      
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
  }, [activeLayerId]);

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
      const canvas = document.createElement('canvas');
      canvas.width = config.outputSize;
      canvas.height = config.outputSize;
      const ctx = canvas.getContext('2d')!;

      // Calculate the ratio between actual export size and UI preview size
      const multiplier = config.outputSize / WORKSPACE_PREVIEW_SIZE;

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
        
        // Scale everything by the multiplier
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
          zip.file(`${layer.file.name.replace(/\.[^/.]+$/, "")}_square.jpg`, blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BatchBox_Square_Layers_${new Date().toISOString().slice(0,10)}.zip`;
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
    handleFilesAdded,
    updateActiveLayer,
    removeLayer,
    exportAll,
    isExporting
  };
};
