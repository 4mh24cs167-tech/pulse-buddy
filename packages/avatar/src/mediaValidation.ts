export interface MediaValidationResult {
  valid: boolean;
  mediaType: 'video' | 'image' | 'unknown';
  mimeType: string;
  errorMessage?: string;
  warningMessage?: string;
  details?: {
    sizeBytes: number;
    sizeMB: number;
    fileName: string;
    suggestedChromaKey: boolean;
  };
}

const SUPPORTED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
];

const SUPPORTED_IMAGE_MIMES = [
  'image/png',
  'image/webp',
  'image/gif',
  'image/jpeg',
  'image/svg+xml',
];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const RECOMMENDED_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Validates an uploaded media file for avatar use.
 * Supports MP4, WebM (including alpha channel), PNG, WebP, GIF, JPEG.
 */
export function validateMediaFile(file: File): MediaValidationResult {
  if (!file) {
    return {
      valid: false,
      mediaType: 'unknown',
      mimeType: '',
      errorMessage: 'No file was provided for upload.',
    };
  }

  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const size = file.size;
  const sizeMB = parseFloat((size / (1024 * 1024)).toFixed(2));

  // Determine media type
  const isVideo =
    SUPPORTED_VIDEO_MIMES.includes(mime) ||
    name.endsWith('.mp4') ||
    name.endsWith('.webm') ||
    name.endsWith('.mov');

  const isImage =
    SUPPORTED_IMAGE_MIMES.includes(mime) ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.svg');

  if (!isVideo && !isImage) {
    return {
      valid: false,
      mediaType: 'unknown',
      mimeType: mime || 'unknown',
      errorMessage: `Unsupported file format "${file.name}". Please upload an MP4 or WebM video, or a transparent PNG/WebP image.`,
      details: {
        sizeBytes: size,
        sizeMB,
        fileName: file.name,
        suggestedChromaKey: false,
      },
    };
  }

  // Check file size limits
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      mediaType: isVideo ? 'video' : 'image',
      mimeType: mime,
      errorMessage: `File size (${sizeMB}MB) exceeds the 50MB maximum limit. Please compress your asset for smooth performance.`,
      details: {
        sizeBytes: size,
        sizeMB,
        fileName: file.name,
        suggestedChromaKey: isVideo,
      },
    };
  }

  let warning: string | undefined;
  if (size > RECOMMENDED_MAX_SIZE_BYTES) {
    warning = `File size is ${sizeMB}MB. For best performance and fast loading, keeping files under 25MB is recommended.`;
  }

  return {
    valid: true,
    mediaType: isVideo ? 'video' : 'image',
    mimeType: mime || (isVideo ? 'video/mp4' : 'image/png'),
    warningMessage: warning,
    details: {
      sizeBytes: size,
      sizeMB,
      fileName: file.name,
      suggestedChromaKey: isVideo, // Videos commonly use green screen
    },
  };
}
