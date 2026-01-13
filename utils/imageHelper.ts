import { ConversionConfig } from '../types';

/**
 * Gets the dimensions (width and height) of an image file.
 */
export const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Converts an image file (PNG, JPG, etc.) to a JPG Blob.
 */
export const convertImageToJpg = async (
  file: File,
  config: ConversionConfig
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const scale = config.scale || 1;
        const targetWidth = Math.max(1, Math.floor(img.width * scale));
        const targetHeight = Math.max(1, Math.floor(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        ctx.fillStyle = config.fillColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas conversion failed'));
            }
          },
          'image/jpeg',
          config.quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Applies a Curves Lookup Table (LUT) and optional color tuning to an image file.
 */
export const applyCurvesToImage = async (
  file: File,
  lut: number[],
  quality: number = 0.9,
  colorTuning?: { temperature: number; tint: number }
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas error'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Color tuning pre-calculations
      let rShift = 0;
      let bShift = 0;
      let gShift = 0;

      if (colorTuning) {
        const { temperature, tint } = colorTuning;
        // Temperature: -100 (Cool/Blue) to +100 (Warm/Amber)
        if (temperature > 0) {
          rShift = temperature * 0.4;
          bShift = -temperature * 0.4;
        } else {
          bShift = -temperature * 0.4;
          rShift = temperature * 0.4;
        }

        // Tint: -100 (Magenta) to +100 (Green)
        gShift = tint * 0.4;
      }

      const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));

      // Apply color tuning then curve LUT
      for (let i = 0; i < data.length; i += 4) {
        // Red
        data[i] = lut[clamp(data[i] + rShift)];
        // Green
        data[i + 1] = lut[clamp(data[i + 1] + gShift)];
        // Blue
        data[i + 2] = lut[clamp(data[i + 2] + bShift)];
        // Alpha (i+3) remains unchanged
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Encoding failed'));
      }, 'image/jpeg', quality);
    };
    
    img.onerror = (err) => reject(err);
    img.src = URL.createObjectURL(file);
  });
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};