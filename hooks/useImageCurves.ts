import { useState, useCallback, useMemo, useEffect } from 'react';
import { ImageFile, ConversionStatus, CurvePoint } from '../types';
import { applyCurvesToImage, getImageDimensions } from '../utils/imageHelper';
import { generateCurveLUT } from '../utils/curveAlgorithms';
import { generateId, getZip } from '../utils/common';

const STORAGE_KEY = 'batchbox_curve_points';

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
  
  // Initialize points from local storage or defaults
  const [points, setPoints] = useState<CurvePoint[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load curve points from localStorage:", e);
    }
    return DEFAULT_POINTS;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  
  // AB Comparison State
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [isABMode, setIsABMode] = useState(true); 
  const [splitPosition, setSplitPosition] = useState(50); 

  // Persist points to local storage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
  }, [points]);

  // Computed LUT based on points
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
        if (!activePreviewId && updated.length > 0) {
            setActivePreviewId(updated[0].id);
        }
        return updated;
    });
  }, [activePreviewId]);

  const handleReferenceAdded = useCallback(async (file: File) => {
    if (referenceImage) {
      URL.revokeObjectURL(referenceImage.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setReferenceImage({
      id: generateId(),
      file,
      previewUrl
    });
    setIsABMode(true);
  }, [referenceImage]);

  const clearReference = useCallback(() => {
    if (referenceImage) {
      URL.revokeObjectURL(referenceImage.previewUrl);
    }
    setReferenceImage(null);
  }, [referenceImage]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const remaining = prev.filter(f => f.id !== id);
      if (activePreviewId === id) {
          setActivePreviewId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  }, [activePreviewId]);

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

  const applyBatch = async () => {
    setIsProcessing(true);
    for (const file of files) {
        if (file.status === ConversionStatus.COMPLETED) continue;
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: ConversionStatus.PROCESSING } : f));
        try {
            const blob = await applyCurvesToImage(file.file, lut);
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
          const fileName = f.file.name.replace(/\.(png|jpe?g)$/i, '') + '_curve.jpg';
          if (f.convertedBlob) {
            zip.file(fileName, f.convertedBlob);
          }
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BatchBox_Curves_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("ZIP generation failed", error);
        alert("Failed to generate ZIP.");
      }
  };

  return {
      files,
      points,
      isProcessing,
      activePreviewId,
      setActivePreviewId,
      handleFilesAdded,
      handleRemoveFile,
      addPoint,
      updatePoint,
      removePoint,
      resetCurves,
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