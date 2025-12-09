import { ConversionConfig } from '../types';

/**
 * Gets the dimensions (width and height) of an image file.
 */
export const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      // Clean up object URL immediately after reading dimensions
      // Note: We don't revoke here if we plan to use the same object URL for preview, 
      // but in this specific implementation, App.tsx creates a separate preview URL.
      // So checking implementation in App.tsx: it creates previewUrl using createObjectURL(file).
      // Here we create a temporary one just for dimensions.
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
 * Handles transparency by filling the background with a specified color.
 * Handles resizing based on config.scale.
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
        // Calculate new dimensions
        const scale = config.scale || 1;
        const targetWidth = Math.max(1, Math.floor(img.width * scale));
        const targetHeight = Math.max(1, Math.floor(img.height * scale));

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        // Fill background (handle transparency)
        ctx.fillStyle = config.fillColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image with new dimensions
        // quality indicates "smoothing" in some browsers, but mainly handled by toBlob type
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        // Export to blob
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
      // Using result from FileReader is safer for local file handling than createObjectURL in some contexts,
      // but createObjectURL is generally faster. We use result here for compatibility.
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
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