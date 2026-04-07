/**
 * Smart Crop Utility for Image Processing
 * Converts images to target dimensions with intelligent cropping
 */

export interface SmartCropOptions {
    width: number;
    height: number;
    minScale?: number;
    ruleOfThirds?: boolean;
    quality?: number;
}

export interface CropResult {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const match = filename.match(/\.(\w+)$/);
    return match ? match[1] : 'jpg';
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalFilename: string, siteId: string | number): string {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const ext = getFileExtension(originalFilename);
    return `${siteId}_${timestamp}.${ext}`;
}

/**
 * Simple smart crop implementation
 * This is a simplified version - for production, consider using a library like smartcrop.js
 */
export function calculateCropArea(
    imgWidth: number,
    imgHeight: number,
    targetWidth: number,
    targetHeight: number
): CropResult {
    const imgAspect = imgWidth / imgHeight;
    const targetAspect = targetWidth / targetHeight;

    let cropWidth: number;
    let cropHeight: number;
    let x: number;
    let y: number;

    if (imgAspect > targetAspect) {
        // Image is wider than target - crop width
        cropHeight = imgHeight;
        cropWidth = imgHeight * targetAspect;
        x = (imgWidth - cropWidth) / 2; // Center crop
        y = 0;
    } else {
        // Image is taller than target - crop height
        cropWidth = imgWidth;
        cropHeight = imgWidth / targetAspect;
        x = 0;
        y = (imgHeight - cropHeight) / 2; // Center crop
    }

    return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
    };
}

/**
 * Smart crop and resize image
 */
export async function smartCropImage(
    file: File,
    targetWidth: number,
    targetHeight: number,
    options: Partial<SmartCropOptions> = {}
): Promise<Blob> {
    const { quality = 0.9 } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                try {
                    // Create canvas for the final output
                    const canvas = document.createElement('canvas');
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // Calculate crop area
                    const crop = calculateCropArea(
                        img.naturalWidth,
                        img.naturalHeight,
                        targetWidth,
                        targetHeight
                    );

                    // Draw the cropped and resized image
                    ctx.drawImage(
                        img,
                        crop.x, crop.y,           // Source x, y
                        crop.width, crop.height,  // Source width, height
                        0, 0,                     // Destination x, y
                        targetWidth, targetHeight // Destination width, height
                    );

                    // Convert to Blob
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Failed to create blob'));
                            }
                        },
                        file.type || 'image/jpeg',
                        quality
                    );
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = event.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Process image file with smart crop
 * Returns a new File object with the processed image
 */
export async function processImageFile(
    file: File,
    targetWidth: number,
    targetHeight: number,
    siteId: string | number
): Promise<File> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
    }

    // Smart crop the image
    const resizedBlob = await smartCropImage(file, targetWidth, targetHeight);

    // Create new unique filename
    const uniqueName = generateUniqueFilename(file.name, siteId);

    // Return new File object
    return new File([resizedBlob], uniqueName, { type: file.type });
}
