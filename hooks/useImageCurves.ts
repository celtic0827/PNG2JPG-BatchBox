import { useState, useCallback, useMemo, useEffect } from 'react';
import { ImageFile, ConversionStatus, CurvePoint, CurvePreset } from '../types';
import { applyCurvesToImage, getImageDimensions } from '../utils/imageHelper';
import { generateCurveLUT } from '../utils/curveAlgorithms';
import { generateId, getZip } from '../utils/common';

const STORAGE_KEY = 'batchbox_curve_points';
const COLOR_STORAGE_KEY = 'batchbox_color_tuning';
const PRESETS_STORAGE_KEY = 'batchbox_curve_presets';

const DEFAULT_POINTS: CurvePoint[] = [
  { id: 'start', x: 0, y: 0 },
  { id: 'end', x: 255, y: 255 }
];

export interface ReferenceImage {
  id: string;
  file: File;
  previewUrl: string;
}

export const useImageCurves = () => {
  const [files, setFiles] = useState<ImageFile[]>([]);
  
  // Initialize points from local storage
  const [points, setPoints] = useState<CurvePoint[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      }
    } catch (e) {}
    return DEFAULT_POINTS;
  });

  // Color Tuning State (-100 to 100)
  const [colorTuning, setColorTuning] = useState<{ temperature: number, tint: number }>(() => {
    try {
      const saved = localStorage.getItem(COLOR_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { temperature: 0, tint: 0 };
  });

  // Presets State
  const [presets, setPresets] = useState<CurvePreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [isABMode, setIsABMode] = useState(true); 
  const [splitPosition, setSplitPosition] = useState(50); 

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
  }, [points]);

  useEffect(() => {
    localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colorTuning));
  }, [colorTuning]);

  useEffect(() => {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const lut = useMemo(() => generateCurveLUT(points), [points]);

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
        if (!activePreviewId && updated.length > 0) setActivePreviewId(updated[0].id);
        return updated;
    });
  }, [activePreviewId]);

  const handleReferenceAdded = useCallback(async (file: File) => {
    if (referenceImage) URL.revokeObjectURL(referenceImage.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setReferenceImage({ id: generateId(), file, previewUrl });
    setIsABMode(true);
  }, [referenceImage]);

  const clearReference = useCallback(() => {
    if (referenceImage) URL.revokeObjectURL(referenceImage.previewUrl);
    setReferenceImage(null);
  }, [referenceImage]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const remaining = prev.filter(f => f.id !== id);
      if (activePreviewId === id) setActivePreviewId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });
  }, [activePreviewId]);

  const handleClearAll = useCallback(() => {
    files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setActivePreviewId(null);
  }, [files]);

  const addPoint = (x: number, y: number) => {
    if (points.some(p => Math.abs(p.x - x) < 5)) return;
    const newPoint: CurvePoint = { id: generateId(), x, y };
    setPoints(prev => [...prev, newPoint].sort((a, b) => a.x - b.x));
  };

  const updatePoint = (id: string, x: number, y: number) => {
    setPoints(prev => prev.map(p => {
        if (p.id !== id) return p;
        return { ...p, x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) };
    }).sort((a, b) => a.x - b.x));
  };

  const removePoint = (id: string) => {
      if (points.length <= 2) return; 
      setPoints(prev => prev.filter(p => p.id !== id));
  };

  const resetCurves = () => setPoints(DEFAULT_POINTS);
  const resetColorTuning = () => setColorTuning({ temperature: 0, tint: 0 });

  // Preset Management
  const savePreset = (name: string) => {
    const newPreset: CurvePreset = {
      id: generateId(),
      name,
      points: [...points],
      colorTuning: { ...colorTuning },
      timestamp: Date.now()
    };
    setPresets(prev => [newPreset, ...prev]);
  };

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setPoints(preset.points);
      setColorTuning(preset.colorTuning);
    }
  };

  const deletePreset = (presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
  };

  const applyBatch = async () => {
    setIsProcessing(true);
    for (const file of files) {
        if (file.status === ConversionStatus.COMPLETED) continue;
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: ConversionStatus.PROCESSING } : f));
        try {
            const blob = await applyCurvesToImage(file.file, lut, 0.9, colorTuning);
            setFiles(prev => prev.map(f => 
                f.id === file.id ? { 
                    ...f, 
                    status: ConversionStatus.COMPLETED, 
                    convertedBlob: blob,
                    convertedSize: blob.size 
                } : f
            ));
        } catch (e) {
            console.error(e);
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: ConversionStatus.ERROR } : f));
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
          const fileName = f.file.name.replace(/\.(png|jpe?g|webp)$/i, '') + '_processed.jpg';
          if (f.convertedBlob) zip.file(fileName, f.convertedBlob);
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BatchBox_Processed_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("ZIP generation failed", error);
      }
  };

  return {
      files,
      points,
      colorTuning,
      setColorTuning,
      presets,
      savePreset,
      loadPreset,
      deletePreset,
      isProcessing,
      activePreviewId,
      setActivePreviewId,
      handleFilesAdded,
      handleRemoveFile,
      handleClearAll,
      addPoint,
      updatePoint,
      removePoint,
      resetCurves,
      resetColorTuning,
      applyBatch,
      downloadZip,
      lut,
      referenceImage,
      handleReferenceAdded,
      clearReference,
      isABMode,
      setIsABMode,
      splitPosition,
      setSplitPosition
  };
};
