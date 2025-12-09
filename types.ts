export enum ConversionStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  status: ConversionStatus;
  convertedBlob?: Blob;
  errorMessage?: string;
  originalSize: number;
  convertedSize?: number;
  width?: number;
  height?: number;
}

export interface ConversionConfig {
  quality: number; // 0.1 to 1.0
  fillColor: string; // Background color for transparency replacement
  scale: number; // 0.01 to 1.0 (Resize percentage)
}