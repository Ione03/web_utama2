import { component$, useSignal, useStore, $, Slot, useVisibleTask$ } from "@builder.io/qwik";
import { ContentTypeSelector } from "./content-type-selector";
import { CKEditorComponent } from "./ckeditor-editor";
import { contentApi, photoApi, getApiBaseOrigin } from "~/services/api";
import { getFileExtension } from "~/utils/common";
import smartcrop from "smartcrop";

// Helper function to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};

// Helper function to extract Vimeo video ID
const getVimeoVideoId = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
};

// Helper function to get video thumbnail URL
const getVideoThumbnailUrl = (videoUrl: string): string | null => {
    // YouTube thumbnail
    const youtubeId = getYouTubeVideoId(videoUrl);
    if (youtubeId) {
        return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    }

    // Vimeo thumbnail (we'll need to fetch it from Vimeo API)
    const vimeoId = getVimeoVideoId(videoUrl);
    if (vimeoId) {
        // For Vimeo, we'll return a placeholder and handle it separately
        return `https://vimeo.com/api/v2/video/${vimeoId}.json`;
    }

    return null;
};

// Helper function to fetch and convert thumbnail to File
const fetchThumbnailAsFile = async (videoUrl: string, filename: string): Promise<File | null> => {
    try {
        let thumbnailUrl = getVideoThumbnailUrl(videoUrl);

        if (!thumbnailUrl) {
            console.log('Could not extract thumbnail URL from video');
            return null;
        }

        // Special handling for Vimeo JSON response
        if (thumbnailUrl.includes('vimeo.com/api')) {
            const response = await fetch(thumbnailUrl);
            const data = await response.json();
            if (data && data[0] && data[0].thumbnail_large) {
                thumbnailUrl = data[0].thumbnail_large;
            } else {
                return null;
            }
        }

        // Fetch the thumbnail image
        const response = await fetch(thumbnailUrl, { mode: 'cors' });
        if (!response.ok) {
            throw new Error('Failed to fetch thumbnail');
        }

        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    } catch (error) {
        console.error('Error fetching video thumbnail:', error);
        return null;
    }
};


interface ContentModalProps {
    heroIsPlaying?: any;
    mode?: 'create' | 'edit';  // Mode: create or edit
    contentCode?: string;  // Encrypted content code for editing
    currentUser?: any;  // Current authenticated user
    isOpen?: boolean;  // External control of modal visibility
    onClose$?: () => void;  // Callback when modal closes
    onSave$?: () => void;  // Callback when content is saved successfully
    isContentModalOpen?: any;  // Signal to track modal visibility globally
}

interface ImageData {
    id: string;
    file: File;
    preview: string;
    processed: string;
    cropCoords: { x: number; y: number; width: number; height: number };
    originalImage: HTMLImageElement | null;
}

export const ContentModal = component$<ContentModalProps>(({ heroIsPlaying, mode = 'create', contentCode, currentUser, isOpen, onClose$, onSave$, isContentModalOpen }) => {
    const showModal = useSignal(isOpen || false);
    const selectedType = useSignal('text_image');
    const isSubmitting = useSignal(false);
    const isLoadingContent = useSignal(false);
    const isDeleting = useSignal(false);
    const contentId = useSignal<number | null>(null);

    const formData = useStore({
        title: '',
        content: '',
        videoUrl: '',
        category: 1,
    });

    // Multi-image state
    const uploadedImages = useStore<ImageData[]>([]);
    const isProcessingImage = useSignal(false);
    const processingProgress = useSignal(0);
    const currentEditingImageId = useSignal<string | null>(null);
    const showManualCrop = useSignal(false);

    // State for existing images (in edit mode)
    const existingImages = useSignal<any[]>([]);
    // Track IDs of images that user explicitly removed (to be deleted on submit)
    const imagesToDelete = useSignal<number[]>([]);

    // Ref for drop zone element (for native event listeners)
    const dropZoneRef = useSignal<HTMLElement>();


    // Drag/zoom states for crop adjustment
    const isDraggingCrop = useSignal(false);
    const dragStart = useSignal({ x: 0, y: 0 });
    const zoomLevel = useSignal(1.0);

    // ContentType ID state
    const contentTypeId = useSignal<number>(7);

    // Image title state
    const imageTitle = useSignal('');

    const code = useSignal("wqrb8ZlvpomrQPQs5gJWeW3R5Z9Cv5CoijrfCclf4zNW2GW9BVg"); // content-01
    // const type = useSignal(2); // 1 = text
    const template = useSignal(1); // 1 = index template

    // Content signal for TipTap editor
    const contentSignal = useSignal(formData.content);


    const openModal = $(async () => {
        showModal.value = true;
        if (isContentModalOpen) {
            isContentModalOpen.value = true;  // Hide logout button
        }
        if (heroIsPlaying) {
            heroIsPlaying.value = false;
        }

        // Load existing content if in edit mode
        if (mode === 'edit' && contentCode) {
            isLoadingContent.value = true;
            try {
                const content = await contentApi.getContentByCode(contentCode);
                console.log('content', content);
                if (content) {
                    // Populate form with existing data
                    formData.title = content.value_text || '';
                    contentSignal.value = content.value_textarea || '';
                    formData.content = content.value_textarea || '';
                    contentId.value = content.id || null;

                    // Set content type based on value_type from backend
                    if (content.value_type === 1) {
                        selectedType.value = 'text';
                    } else if (content.value_type === 2) {
                        selectedType.value = 'text_image';
                    } else if (content.value_type === 3) {
                        selectedType.value = 'video';
                        // Load video URL into videoUrl field for video content
                        formData.videoUrl = content.value_video || '';
                    }

                    existingImages.value = content.images || [];

                    // Load existing images
                    // if (content.encrypted_id) {
                    //     console.log('Loading photos for encrypted_id:', content.encrypted_id);
                    //     try {
                    //         const photos = await photoApi.getPhotoByObjectId(content.encrypted_id);
                    //         if (photos && photos.length > 0) {
                    //             // Store existing images for display
                    //             existingImages.value = photos;
                    //             console.log('Loaded existing images:', photos);
                    //             console.log('First image object:', photos[0]);
                    //             console.log('First image.image value:', photos[0].image);
                    //         } else {
                    //             console.log('No photos found for encrypted_id:', content.encrypted_id);
                    //         }
                    //     } catch (error) {
                    //         console.error('Error loading photos:', error);
                    //         // Don't fail the whole modal if images fail to load
                    //         existingImages.value = [];
                    //     }
                    // } else {
                    //     console.log('No encrypted_id available, skipping photo load');
                    //     existingImages.value = [];
                    // }
                }
            } catch (error) {
                console.error('Error loading content for edit:', error);
                alert('Failed to load content. Please try again.');
            } finally {
                isLoadingContent.value = false;
            }
        }
    });

    // Sync external isOpen prop with internal showModal state
    useVisibleTask$(({ track }) => {
        track(() => isOpen);
        if (isOpen !== undefined && isOpen && mode === 'edit' && contentCode) {
            // Trigger content loading when opened externally
            showModal.value = true;
            openModal();
        } else if (isOpen === false) {
            // Close modal when isOpen becomes false
            showModal.value = false;
        }
    });

    const closeModal = $(() => {
        showModal.value = false;
        if (isContentModalOpen) {
            isContentModalOpen.value = false;  // Show logout button again
        }
        // Reset form
        formData.title = '';
        formData.content = '';
        formData.videoUrl = '';
        selectedType.value = 'text_image';
        uploadedImages.splice(0, uploadedImages.length);
        existingImages.value = []; // Reset existing images
        imagesToDelete.value = []; // Reset deletion queue
        currentEditingImageId.value = null;
        showManualCrop.value = false;
        imageTitle.value = ''; // Reset image title
        contentId.value = null;
        if (heroIsPlaying) {
            heroIsPlaying.value = true;
        }
        // Call external onClose callback if provided
        if (onClose$) {
            onClose$();
        }
    });

    // Remove existing image (marks for deletion)
    const removeExistingImage = $((imageId: number) => {
        // Add to deletion queue
        if (!imagesToDelete.value.includes(imageId)) {
            imagesToDelete.value = [...imagesToDelete.value, imageId];
        }
        // Remove from UI
        existingImages.value = existingImages.value.filter(img => img.id !== imageId);
    });

    // Process image file with smartcrop
    const processImageFile = $(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select a valid image file (PNG, JPG, GIF, WebP)');
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error(`File size exceeds 5MB limit.Your file is ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
        }

        try {
            isProcessingImage.value = true;
            processingProgress.value = 10;

            const targetWidth = 1280;
            const targetHeight = 720;

            processingProgress.value = 30;
            const url = URL.createObjectURL(file);
            const img = new Image();

            const result = await new Promise<ImageData>((resolve, reject) => {
                img.onload = async () => {
                    try {
                        processingProgress.value = 50;

                        // Run Smartcrop
                        const cropResult = await smartcrop.crop(img, { width: targetWidth, height: targetHeight });
                        const crop = cropResult.topCrop;

                        processingProgress.value = 70;

                        // Draw cropped area to canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            throw new Error('Failed to get canvas context');
                        }

                        ctx.drawImage(
                            img,
                            crop.x, crop.y, crop.width, crop.height,
                            0, 0, targetWidth, targetHeight
                        );

                        processingProgress.value = 90;
                        const dataURL = canvas.toDataURL(file.type || 'image/jpeg', 0.9);

                        // Create image data object
                        const imageData: ImageData = {
                            id: `${Date.now()}_${Math.random()} `,
                            file,
                            preview: URL.createObjectURL(file),
                            processed: dataURL,
                            cropCoords: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
                            originalImage: img,
                        };

                        resolve(imageData);
                        URL.revokeObjectURL(url);
                    } catch (error) {
                        reject(error);
                    }
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = url;
            });

            uploadedImages.push(result);
            processingProgress.value = 100;
            isProcessingImage.value = false;

        } catch (error) {
            console.error('Error processing image:', error);
            alert(error instanceof Error ? error.message : 'Failed to process image');
            isProcessingImage.value = false;
            throw error;
        }
    });

    // Handle file upload
    const handleImageUpload = $(async (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            try {
                await processImageFile(input.files[0]);
                input.value = ''; // Clear input
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
                alert(errorMessage);
                input.value = '';
            }
        }
    });

    // Remove image from list
    const removeImage = $((imageId: string) => {
        const index = uploadedImages.findIndex(img => img.id === imageId);
        if (index !== -1) {
            uploadedImages.splice(index, 1);
        }
    });

    // Apply crop adjustment
    const applyCrop = $((imageId: string) => {
        const image = uploadedImages.find(img => img.id === imageId);
        if (!image || !image.originalImage) return;

        const targetWidth = 1280;
        const targetHeight = 720;
        const img = image.originalImage;
        const coords = image.cropCoords;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(
                img,
                coords.x, coords.y, coords.width, coords.height,
                0, 0, targetWidth, targetHeight
            );

            image.processed = canvas.toDataURL('image/jpeg', 0.9);
        }
    });

    // Adjust crop position
    const adjustCropPosition = $((imageId: string, dx: number, dy: number) => {
        const image = uploadedImages.find(img => img.id === imageId);
        if (!image || !image.originalImage) return;

        const img = image.originalImage;
        const coords = image.cropCoords;

        const newX = Math.max(0, Math.min(img.width - coords.width, coords.x + dx));
        const newY = Math.max(0, Math.min(img.height - coords.height, coords.y + dy));

        image.cropCoords = { ...coords, x: newX, y: newY };
        applyCrop(imageId);
    });

    // Handle crop drag
    const handleCropMouseDown = $((imageId: string, event: MouseEvent) => {
        event.preventDefault();
        isDraggingCrop.value = true;
        currentEditingImageId.value = imageId;
        dragStart.value = { x: event.clientX, y: event.clientY };
    });

    const handleCropMouseMove = $((event: MouseEvent) => {
        if (!isDraggingCrop.value || !currentEditingImageId.value) return;
        event.preventDefault();

        const dx = event.clientX - dragStart.value.x;
        const dy = event.clientY - dragStart.value.y;

        dragStart.value = { x: event.clientX, y: event.clientY };
        adjustCropPosition(currentEditingImageId.value, -dx * 2, -dy * 2);
    });

    const handleCropMouseUp = $(() => {
        isDraggingCrop.value = false;
        currentEditingImageId.value = null;
    });

    // Handle scroll zoom on crop preview
    const handleCropWheel = $((imageId: string, event: WheelEvent) => {
        event.preventDefault();
        const image = uploadedImages.find(img => img.id === imageId);
        if (!image || !image.originalImage) return;

        const img = image.originalImage;
        const coords = image.cropCoords;
        const targetWidth = 1280;
        const targetHeight = 720;

        // Zoom in/out (deltaY negative = scroll up = zoom in)
        const zoomDelta = event.deltaY > 0 ? 0.1 : -0.1;
        const newZoom = Math.max(0.5, Math.min(3.0, zoomLevel.value + zoomDelta));

        if (newZoom === zoomLevel.value) return;

        // Calculate new crop dimensions based on zoom
        const aspectRatio = targetWidth / targetHeight;
        let newWidth = coords.width / (newZoom / zoomLevel.value);
        let newHeight = newWidth / aspectRatio;

        // Ensure crop doesn't exceed image bounds
        if (newWidth > img.width) {
            newWidth = img.width;
            newHeight = newWidth / aspectRatio;
        }
        if (newHeight > img.height) {
            newHeight = img.height;
            newWidth = newHeight * aspectRatio;
        }

        // Center the zoom on current crop center
        const centerX = coords.x + coords.width / 2;
        const centerY = coords.y + coords.height / 2;
        const newX = Math.max(0, Math.min(img.width - newWidth, centerX - newWidth / 2));
        const newY = Math.max(0, Math.min(img.height - newHeight, centerY - newHeight / 2));

        zoomLevel.value = newZoom;
        image.cropCoords = { x: newX, y: newY, width: newWidth, height: newHeight };
        applyCrop(imageId);
    });

    // Convert data URL to File
    const dataURLtoFile = $((dataurl: string, filename: string): File => {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    });

    const handleSubmit = $(async () => {
        isSubmitting.value = true;
        console.log(';mode', mode, contentCode);

        // Validation
        const title = formData.title.trim();
        const content = contentSignal.value.trim();

        // Text and content are always required
        if (!title) {
            alert('Title is required');
            isSubmitting.value = false;
            return;
        }

        if (!content) {
            alert('Content is required');
            isSubmitting.value = false;
            return;
        }

        // For video type, video URL is also required and must be valid
        if (selectedType.value === 'video') {
            const videoUrl = formData.videoUrl.trim();
            if (!videoUrl) {
                alert('Video URL is required for video content');
                isSubmitting.value = false;
                return;
            }

            // Validate URL format
            try {
                new URL(videoUrl);
            } catch (error) {
                alert('Please enter a valid video URL (e.g., https://youtube.com/watch?v=...)');
                isSubmitting.value = false;
                return;
            }
        }

        // For text_image type, images are optional (no validation needed)

        try {
            if (mode === 'edit' && contentCode) {
                // UPDATE MODE - Update existing content
                const updateData = {
                    value_type: selectedType.value === 'text' ? 1 : selectedType.value === 'text_image' ? 2 : 3,
                    value_text: formData.title,
                    value_textarea: contentSignal.value,
                    value_video: selectedType.value === 'video' ? formData.videoUrl : '',
                    code: contentCode,
                };

                await contentApi.updateContentByCode(contentCode, updateData as any);

                // Delete images that user explicitly removed (by clicking Remove button)
                if (imagesToDelete.value.length > 0) {
                    for (const imageId of imagesToDelete.value) {
                        try {
                            await photoApi.deletePhoto(imageId);
                            console.log(`Deleted image with ID: ${imageId}`);
                        } catch (error) {
                            console.error(`Failed to delete image ${imageId}:`, error);
                            // Continue with other deletions even if one fails
                        }
                    }
                }

                // Handle image updates if any new images were added
                if (uploadedImages.length > 0) {
                    // First, get the content to get encrypted_id
                    const content = await contentApi.getContentByCode(contentCode);

                    if (content?.encrypted_id) {
                        // Upload new images (don't delete existing ones)
                        for (const imageData of uploadedImages) {
                            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
                            const ext = getFileExtension(imageData.file.name);
                            const uniqueName = `upload_${timestamp}_${Math.random()}.${ext}`;

                            const imageFile = await dataURLtoFile(imageData.processed, uniqueName);

                            await photoApi.createPhoto({
                                content_type: contentTypeId.value,
                                object_id: content.encrypted_id,
                                image: imageFile,
                                title: imageTitle.value || formData.title || 'Image',
                                alt_text: formData.title || 'Image'
                            });
                        }
                    }
                }

                // For video content, fetch and save thumbnail
                if (selectedType.value === 'video' && formData.videoUrl) {
                    const content = await contentApi.getContentByCode(contentCode);

                    if (content?.encrypted_id) {
                        try {
                            const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
                            const thumbnailFile = await fetchThumbnailAsFile(
                                formData.videoUrl,
                                `video_thumbnail_${timestamp}.jpg`
                            );

                            if (thumbnailFile) {
                                await photoApi.createPhoto({
                                    content_type: contentTypeId.value,
                                    object_id: content.encrypted_id,
                                    image: thumbnailFile,
                                    title: `${formData.title} - Thumbnail`,
                                    alt_text: formData.title || 'Video Thumbnail'
                                });
                                console.log('Video thumbnail saved successfully');
                            }
                        } catch (error) {
                            console.error('Failed to save video thumbnail:', error);
                            // Don't fail the whole operation if thumbnail fails
                        }
                    }
                }

                // alert('Content updated successfully!');
                closeModal();
                // Refresh data via callback instead of page reload
                if (onSave$) {
                    onSave$();
                }
            } else {
                // CREATE MODE - Original logic
                contentApi.getContentByCode(code.value).then(async (data) => {
                    console.log('--data-- parent', data);

                    if (!data) {
                        const contentData = {
                            template: template.value,
                            value_type: selectedType.value === 'text' ? 1 : selectedType.value === 'text_image' ? 2 : 3,
                            content_type: 3,  // ContentTypeChoice.CONTENT
                            code: code.value,
                            title: formData.title,
                            value_textarea: contentSignal.value,
                            value_text: formData.title,
                            value_video: selectedType.value === 'video' ? formData.videoUrl : '',
                            value_image: uploadedImages.length > 0 ? uploadedImages[0].processed : '',
                            width: 1280,
                            height: 720,
                        };

                        const result = await contentApi.createContentCustom(contentData);
                        console.log('Content created becouse parent not exists:', result, uploadedImages.length);

                        // Upload all images if any
                        if (uploadedImages.length > 0 && result.data?.encrypted_id) {
                            for (const imageData of uploadedImages) {
                                const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
                                const ext = getFileExtension(imageData.file.name);
                                const uniqueName = `upload_${timestamp}_${Math.random()}.${ext}`;

                                const imageFile = await dataURLtoFile(imageData.processed, uniqueName);

                                await photoApi.createPhoto({
                                    content_type: contentTypeId.value,
                                    object_id: result.data.encrypted_id,
                                    image: imageFile,
                                    title: imageTitle.value || formData.title || 'Image',
                                    alt_text: formData.title || 'Image'
                                });
                            }
                            console.log(`Uploaded ${uploadedImages.length} images`);
                        }

                        // For video content, fetch and save thumbnail
                        if (selectedType.value === 'video' && formData.videoUrl && result.data?.encrypted_id) {
                            try {
                                const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
                                const thumbnailFile = await fetchThumbnailAsFile(
                                    formData.videoUrl,
                                    `video_thumbnail_${timestamp}.jpg`
                                );

                                if (thumbnailFile) {
                                    await photoApi.createPhoto({
                                        content_type: contentTypeId.value,
                                        object_id: result.data.encrypted_id,
                                        image: thumbnailFile,
                                        title: `${formData.title} - Thumbnail`,
                                        alt_text: formData.title || 'Video Thumbnail'
                                    });
                                    console.log('Video thumbnail saved successfully');
                                }
                            } catch (error) {
                                console.error('Failed to save video thumbnail:', error);
                            }
                        }
                        // alert('Content created successfully!');
                        closeModal();
                        // Refresh data via callback instead of page reload
                        if (onSave$) {
                            onSave$();
                        }
                    }
                    else {
                        const contentData = {
                            template: template.value,
                            value_type: selectedType.value === 'text' ? 1 : selectedType.value === 'text_image' ? 2 : 3,
                            content_type: 3,  // ContentTypeChoice.CONTENT
                            code: data.next_code,
                            parent: data.encrypted_id,
                            title: formData.title,
                            value_textarea: contentSignal.value,
                            value_text: formData.title,
                            value_video: selectedType.value === 'video' ? formData.videoUrl : '',
                            value_image: uploadedImages.length > 0 ? uploadedImages[0].processed : '',
                            width: 1280,
                            height: 720,
                        };
                        console.log('contentData', contentData);

                        const result = await contentApi.createContentCustom(contentData);
                        console.log('Content created (parent exists):', result, uploadedImages.length);

                        // Upload all images if any
                        if (uploadedImages.length > 0 && result.data?.encrypted_id) {
                            for (const imageData of uploadedImages) {
                                const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
                                const ext = getFileExtension(imageData.file.name);
                                const uniqueName = `upload_${timestamp}_${Math.random()}.${ext}`;

                                const imageFile = await dataURLtoFile(imageData.processed, uniqueName);

                                await photoApi.createPhoto({
                                    content_type: contentTypeId.value,
                                    object_id: result.data.encrypted_id,
                                    image: imageFile,
                                    title: imageTitle.value || formData.title || 'Image',
                                    alt_text: formData.title || 'Image'
                                });
                            }
                            console.log(`Uploaded ${uploadedImages.length} images`);
                        }

                        // For video content, fetch and save thumbnail
                        if (selectedType.value === 'video' && formData.videoUrl && result.data?.encrypted_id) {
                            try {
                                const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
                                const thumbnailFile = await fetchThumbnailAsFile(
                                    formData.videoUrl,
                                    `video_thumbnail_${timestamp}.jpg`
                                );

                                if (thumbnailFile) {
                                    await photoApi.createPhoto({
                                        content_type: contentTypeId.value,
                                        object_id: result.data.encrypted_id,
                                        image: thumbnailFile,
                                        title: `${formData.title} - Thumbnail`,
                                        alt_text: formData.title || 'Video Thumbnail'
                                    });
                                    console.log('Video thumbnail saved successfully');
                                }
                            } catch (error) {
                                console.error('Failed to save video thumbnail:', error);
                            }
                        }

                        // alert('Content created successfully!');
                        closeModal();
                        // Refresh data via callback instead of page reload
                        if (onSave$) {
                            onSave$();
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error saving content:', error);
            alert('Failed to save content. Please try again.');
        } finally {
            isSubmitting.value = false;
        }
    });

    // Handle delete
    const handleDelete = $(async () => {
        if (!contentCode || mode !== 'edit') return;

        const confirmDelete = confirm('Are you sure you want to delete this content? This action cannot be undone.');
        if (!confirmDelete) return;

        isDeleting.value = true;

        try {
            // Delete associated photos first
            const content = await contentApi.getContentByCode(contentCode);
            if (content?.encrypted_id) {
                try {
                    await photoApi.deletePhotoByObjectId(content.encrypted_id as any);
                } catch (error) {
                    console.log('No photos to delete or error:', error);
                }
            }

            // Delete the content
            await contentApi.deleteContentByCode(contentCode);

            alert('Content deleted successfully!');
            closeModal();

            // Refresh data via callback instead of page reload
            if (onSave$) {
                onSave$();
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            alert('Failed to delete content. Please try again.');
        } finally {
            isDeleting.value = false;
        }
    });

    // Fetch ContentType ID
    useVisibleTask$(async () => {
        try {
            const id = await photoApi.getContentTypeId();
            contentTypeId.value = id;
        } catch (error) {
            console.error('Failed to fetch ContentType ID:', error);
        }
    });

    // Add native DOM event listeners for drag and drop to work on first attempt
    useVisibleTask$(({ cleanup }) => {
        const dropZone = dropZoneRef.value;
        if (!dropZone) return;

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
            }
        };

        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (isProcessingImage.value) return;

            const files = e.dataTransfer?.files;
            if (files && files[0]) {
                try {
                    await processImageFile(files[0]);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
                    alert(errorMessage);
                    console.error('Error processing dropped file:', error);
                }
            }
        };

        // Attach native event listeners
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragenter', handleDragEnter);
        dropZone.addEventListener('drop', handleDrop);

        // Cleanup on unmount
        cleanup(() => {
            dropZone.removeEventListener('dragover', handleDragOver);
            dropZone.removeEventListener('dragenter', handleDragEnter);
            dropZone.removeEventListener('drop', handleDrop);
        });
    });

    return (
        <>
            {/* Trigger Button */}
            <div class="inline-block group active:bg-transparent" onClick$={openModal}>
                <Slot />
            </div>

            {/* Modal */}
            {showModal.value && (
                <div class="fixed inset-0 z-[99999] overflow-y-auto">
                    {/* Overlay */}
                    <div
                        onClick$={closeModal}
                        class="fixed inset-0 bg-black/70 transition-opacity"
                    />

                    {/* Modal Container */}
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div class="flex justify-between items-center p-6 border-b border-gray-200">
                                <div class="flex items-center gap-4">
                                    <h2 class="text-2xl font-bold">{mode === 'edit' ? 'Edit Content' : 'Create New Content'}</h2>
                                    {/* Content Type Selector - moved here to save space */}
                                    <ContentTypeSelector selectedType={selectedType} editMode={mode === 'edit'} />
                                </div>
                                <button
                                    onClick$={closeModal}
                                    type="button"
                                    class="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Content */}
                            <div class="p-6">
                                {/* Form Fields */}
                                <div class="space-y-4">
                                    {/* Title */}
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onInput$={(e) => {
                                                formData.title = (e.target as HTMLInputElement).value;
                                            }}
                                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter content title"
                                            required
                                        />
                                    </div>

                                    {/* Content Editor - for all types */}
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Content *
                                        </label>
                                        <CKEditorComponent content={contentSignal} placeholder="Start writing your content..." />
                                    </div>

                                    {/* Image Upload - for text_image type */}
                                    {selectedType.value === 'text_image' && (
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2 w-full flex justify-between items-center">
                                                Images ({existingImages.value.length + uploadedImages.length})
                                            </label>

                                            {/* Existing Images (in edit mode) */}
                                            {existingImages.value.length > 0 && (
                                                <div class="space-y-3 mb-4">
                                                    <p class="text-xs font-medium text-gray-600">Existing Images:</p>
                                                    {existingImages.value.map((image) => {
                                                        // Prepend server URL if image path is relative
                                                        // Handle both .image and .image_url fields
                                                        const imagePath = image.image_url || image.image;
                                                        const imageUrl = imagePath?.startsWith('http')
                                                            ? imagePath
                                                            : `${getApiBaseOrigin()}${imagePath}`;

                                                        console.log('Rendering existing image:', {
                                                            id: image.id,
                                                            imagePath,
                                                            imageUrl,
                                                            fullImage: image
                                                        });

                                                        return (
                                                            <div key={image.id} class="border rounded-lg p-3 bg-blue-50">
                                                                <div class="flex gap-3">
                                                                    <img
                                                                        src={imageUrl}
                                                                        alt={image.title || 'Existing image'}
                                                                        class="w-32 h-20 object-cover rounded"
                                                                        onError$={(e) => {
                                                                            console.error('Image failed to load:', imageUrl);
                                                                            // Set a placeholder or hide broken image
                                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                                        }}
                                                                    />
                                                                    <div class="flex-1">
                                                                        <p class="text-sm font-medium text-gray-700">{image.title || 'Untitled'}</p>
                                                                        <p class="text-xs text-gray-500">
                                                                            Existing image from database
                                                                        </p>
                                                                        <p class="text-xs text-gray-400 mt-1 break-all">{imageUrl}</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick$={() => removeExistingImage(image.id)}
                                                                        class="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm cursor-pointer"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Uploaded Images List */}
                                            {uploadedImages.length > 0 && (
                                                <div class="space-y-3 mb-4">
                                                    {existingImages.value.length > 0 && (
                                                        <p class="text-xs font-medium text-gray-600">New Images to Upload:</p>
                                                    )}
                                                    {uploadedImages.map((image) => (
                                                        <div key={image.id} class="border rounded-lg p-3 bg-gray-50">
                                                            <div class="flex gap-3">
                                                                <img
                                                                    src={image.processed}
                                                                    alt="Preview"
                                                                    class="w-32 h-20 object-cover rounded cursor-move"
                                                                    onMouseDown$={(e) => handleCropMouseDown(image.id, e)}
                                                                    onMouseMove$={handleCropMouseMove}
                                                                    onMouseUp$={handleCropMouseUp}
                                                                    onWheel$={(e) => handleCropWheel(image.id, e)}
                                                                    title="Drag to adjust crop | Scroll to zoom"
                                                                />
                                                                <div class="flex-1">
                                                                    <p class="text-sm font-medium text-gray-700">{image.file.name}</p>
                                                                    <p class="text-xs text-gray-500">
                                                                        {(image.file.size / 1024).toFixed(1)} KB • Smart cropped to 1280x720
                                                                    </p>
                                                                    <p class="text-xs text-blue-600 mt-1">
                                                                        💡 Drag to reposition | Scroll to zoom (0.5x-3x)
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick$={() => removeImage(image.id)}
                                                                    class="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Add Image Button */}
                                            <div class="flex items-center justify-center w-full">
                                                <label
                                                    ref={dropZoneRef}
                                                    class={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition duration-200 ${isProcessingImage.value
                                                        ? 'bg-blue-50 cursor-wait border-blue-400'
                                                        : 'cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300'
                                                        }`}
                                                    preventdefault:dragover
                                                    preventdefault:dragenter
                                                    preventdefault:drop
                                                    onDrop$={async (e) => {
                                                        e.stopPropagation();
                                                        if (isProcessingImage.value) return;
                                                        const files = e.dataTransfer?.files;
                                                        if (files && files[0]) {
                                                            try {
                                                                await processImageFile(files[0]);
                                                            } catch (error) {
                                                                const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
                                                                alert(errorMessage);
                                                                console.error('Error processing dropped file:', error);
                                                            }
                                                        }
                                                    }}
                                                    onDragEnter$={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    onDragLeave$={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    onDragOver$={(e) => {
                                                        e.stopPropagation();
                                                        // This is critical for allowing drop
                                                        if (e.dataTransfer) {
                                                            e.dataTransfer.dropEffect = 'copy';
                                                        }
                                                    }}
                                                >
                                                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                                        {isProcessingImage.value ? (
                                                            <>
                                                                <svg class="w-8 h-8 text-blue-500 mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                </svg>
                                                                <p class="mb-2 text-sm text-blue-600 font-semibold">
                                                                    Processing image... {processingProgress.value}%
                                                                </p>
                                                                <div class="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-xs">
                                                                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style={`width:${processingProgress.value}%`}></div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                                                </svg>
                                                                <p class="mb-2 text-sm text-gray-500">
                                                                    <span class="font-semibold">Click to add {uploadedImages.length > 0 ? 'another ' : ''}image</span>
                                                                </p>
                                                                <p class="text-xs text-gray-500">PNG, JPG, GIF, WebP (max 5MB)</p>
                                                            </>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="image-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        class="hidden"
                                                        onChange$={handleImageUpload}
                                                        disabled={isProcessingImage.value}
                                                    />
                                                </label>
                                            </div>

                                            {/* Image Title Input */}
                                            <div class="mt-3">
                                                <label class="block text-xs font-medium text-gray-600 mb-1" for="image_title_content_modal">
                                                    Image Title (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    id="image_title_content_modal"
                                                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition duration-200"
                                                    placeholder="Enter a title for your images"
                                                    value={imageTitle.value}
                                                    onInput$={(e) => imageTitle.value = (e.target as HTMLInputElement).value}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Video URL - for video type */}
                                    {selectedType.value === 'video' && (
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                Video URL *
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.videoUrl}
                                                onInput$={(e) => {
                                                    formData.videoUrl = (e.target as HTMLInputElement).value;
                                                }}
                                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="https://youtube.com/..."
                                            />
                                        </div>
                                    )}
                                </div >
                            </div >

                            {/* Footer */}
                            < div class="flex justify-between p-6 border-t border-gray-200" >
                                {/* Delete button - only in edit mode */}
                                {
                                    mode === 'edit' && (
                                        <button
                                            onClick$={handleDelete}
                                            disabled={isDeleting.value || isSubmitting.value}
                                            type="button"
                                            class={`px-6 py-2 rounded-lg text-white ${isDeleting.value || isSubmitting.value
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                        >
                                            {isDeleting.value ? 'Deleting...' : '🗑️ Delete'}
                                        </button>
                                    )
                                }

                                {/* Right side buttons */}
                                <div class="flex gap-3 ml-auto">
                                    <button
                                        onClick$={closeModal}
                                        type="button"
                                        class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick$={handleSubmit}
                                        disabled={isSubmitting.value || !formData.title || !contentSignal.value || isLoadingContent.value}
                                        type="button"
                                        class={`px-6 py-2 rounded-lg text-white cursor-pointer ${isSubmitting.value || !formData.title || !contentSignal.value || isLoadingContent.value
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        {isSubmitting.value ? (mode === 'edit' ? 'Updating...' : 'Creating...') : (mode === 'edit' ? 'Update Content' : 'Create Content')}
                                    </button>
                                </div>
                            </div >
                        </div >
                    </div >
                </div >
            )}
        </>
    );
});
