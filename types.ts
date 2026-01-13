
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

export interface LayerImage {
  id: string;
  file: File;
  previewUrl: string;
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export interface ZipTask {
  id: string;
  folderName: string;
  files: File[];
  status: ConversionStatus;
  zipBlob?: Blob;
  totalSize: number;
  zipSize?: number;
  progress?: number; // 0 to 100
}

export interface ConversionConfig {
  quality: number; // 0.1 to 1.0
  fillColor: string; // Background color for transparency replacement
  scale: number; // 0.01 to 1.0 (Resize percentage)
}

export interface CropperConfig {
  outputSize: number; // e.g., 1024
  quality: number;
  fillColor: string;
}

export interface CurvePoint {
  id: string;
  x: number; // 0-255
  y: number; // 0-255
}

export interface CurvesConfig {
  points: CurvePoint[];
  channel: 'RGB' | 'R' | 'G' | 'B'; // Future proofing, currently focusing on Master (RGB)
}
