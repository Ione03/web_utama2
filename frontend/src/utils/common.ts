import { useContext } from '@builder.io/qwik';
import { GlobalContext } from '~/services/global-context';

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const match = filename.match(/\.(\w+)$/);
    return match ? match[1] : 'jpg';
};

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalFilename: string): string {
    const global = useContext(GlobalContext);
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const ext = getFileExtension(originalFilename);
    return `${global.id}_${timestamp}.${ext}`;
};
