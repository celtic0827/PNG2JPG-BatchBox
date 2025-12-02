import { ConversionConfig } from '../types';

/**
 * Converts a PNG file (or any image supported by <img>) to a JPG Blob.
 * Handles transparency by filling the background with a specified color.
 */
export const convertPngToJpg = async (
  file: File,
  config: ConversionConfig
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        // Fill background (handle transparency)
        ctx.fillStyle = config.fillColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
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