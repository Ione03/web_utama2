// src/components/ModalForm.tsx
import { component$, useSignal, $, useVisibleTask$, Slot, Signal } from '@builder.io/qwik';
import { contentApi, photoApi, OptValueType, ContentTypeChoice } from '~/services/api';
import { getFileExtension } from '~/utils/common';
import smartcrop from 'smartcrop';

// Interface untuk props modal
interface EditModalProps {
  formData: {
    modalTitle: string;
    modalCode: string;
    modalType: OptValueType;
    modalWidth: string;
    modalHeight: string;
    value_text: string;
    value_textarea: string;
    value_image: string; // Store as data URL for serialization
    content_type?: ContentTypeChoice;
    processedFileName: string; // Track the filename separately
    imagePreview: string;
  };
  heroIsPlaying?: Signal<boolean>; // Optional signal to control hero slideshow
};

export const ModalForm = component$<EditModalProps>(({ formData, heroIsPlaying }) => {
  // Internal state management
  const internalIsOpen = useSignal(false);
  const showModal = useSignal(false);
  const showContent = useSignal(false);
  const firstInputRef = useSignal<HTMLInputElement>();
  const isProcessingImage = useSignal(false);
  const isDragging = useSignal(false);
  const processingProgress = useSignal(0); // 0-100 for progress indication
  const originalImagePreview = useSignal(''); // Store original image for comparison

  // Manual crop adjustment states
  const showManualCrop = useSignal(false); // Toggle manual crop mode
  const cropCoords = useSignal({ x: 0, y: 0, width: 0, height: 0 }); // Current crop coordinates
  const smartCropBackup = useSignal(''); // Backup of smartcrop result
  const loadedImage = useSignal<HTMLImageElement | null>(null); // Store loaded image element
  const zoomLevel = useSignal(1.0); // Zoom level for crop area (1.0 = 100%)
  const isDraggingCrop = useSignal(false); // Track drag state
  const dragStart = useSignal({ x: 0, y: 0 }); // Drag start position

  // Toast notification states
  const showToast = useSignal(false);
  const toastMessage = useSignal('');
  const toastType = useSignal<'success' | 'error'>('success');

  // ContentType ID state (fetched from backend)
  const contentTypeId = useSignal<number>(7); // Default to 7, will be fetched dynamically

  // Loading state for photo upload
  const isUploadingPhoto = useSignal(false);

  // Image title state
  const imageTitle = useSignal('');

  // Fungsi untuk menutup modal dengan animasi
  const closeModal = $(() => {
    showContent.value = false;
    // formData.imagePreview = ""; // reset image preview
    formData.modalTitle = formData.imagePreview; // reset title

    // Resume slideshow when modal closes
    if (heroIsPlaying) {
      heroIsPlaying.value = true;
    }

    setTimeout(() => {
      loadedImage.value = null;
      showManualCrop.value = false;
      showModal.value = false;
      internalIsOpen.value = false;
    }, 200);
  });

  // Fungsi untuk membuka modal dengan animasi
  const openModal = $(() => {
    // console.log('formData.modalType', typeof (formData.modalType));
    // formData.imagePreview = ""; // reset image preview
    // formData.modalTitle = ""; // reset title
    // console.log('Opening modal for code:', formData.modalCode);

    // Pause slideshow when modal opens
    if (heroIsPlaying) {
      heroIsPlaying.value = false;
    }

    showModal.value = true;
    internalIsOpen.value = true;
    setTimeout(() => {
      showContent.value = true;
    }, 50);
  });

  // Helper function to show toast notifications
  const showNotification = $((message: string, type: 'success' | 'error') => {
    toastMessage.value = message;
    toastType.value = type;
    showToast.value = true;
    setTimeout(() => {
      showToast.value = false;
    }, 3000); // Auto-dismiss after 3 seconds
  });


  // Handle klik di luar modal
  const handleOutsideClick = $((event: MouseEvent) => {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      closeModal();
    }
  });

  // Process image file with smartcrop
  const processImageFile = $(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file (PNG, JPG, GIF, WebP)');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error(`File size exceeds 5MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    try {
      isProcessingImage.value = true;
      processingProgress.value = 10;

      // Get target dimensions from formData
      const targetWidth = parseInt(formData.modalWidth) || 300;
      const targetHeight = parseInt(formData.modalHeight) || 300;

      console.log('Processing image:', file.name, 'Target:', targetWidth, 'x', targetHeight);

      // Load image
      processingProgress.value = 30;
      const url = URL.createObjectURL(file);
      const img = new Image();

      const dataUrl = await new Promise<string>((resolve, reject) => {
        img.onload = async () => {
          try {
            processingProgress.value = 50;

            // Store original image for comparison
            const originalCanvas = document.createElement('canvas');
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            const originalCtx = originalCanvas.getContext('2d');
            if (originalCtx) {
              originalCtx.drawImage(img, 0, 0);
              originalImagePreview.value = originalCanvas.toDataURL('image/jpeg', 0.9);
            }

            processingProgress.value = 60;
            // Run Smartcrop
            const cropResult = await smartcrop.crop(img, { width: targetWidth, height: targetHeight });
            console.log('smartcrop result:', cropResult);


            // Store crop coordinates and image for manual adjustment
            const crop = cropResult.topCrop;
            cropCoords.value = { x: crop.x, y: crop.y, width: crop.width, height: crop.height };
            loadedImage.value = img;

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

            // Convert canvas to data URL (Qwik serializable)
            processingProgress.value = 90;
            const dataURL = canvas.toDataURL(file.type || 'image/jpeg', 0.9);
            resolve(dataURL);

            // Clean up
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

      // Generate unique filename inline (can't use useContext in $ functions)
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
      const ext = getFileExtension(file.name);
      const uniqueName = `upload_${timestamp}.${ext}`;

      // Set the processed data URL and filename to formData (both are serializable)
      formData.value_image = dataUrl;
      formData.processedFileName = uniqueName;
      formData.imagePreview = dataUrl;

      // Store backup for manual adjustment
      smartCropBackup.value = dataUrl;

      processingProgress.value = 100;
      isProcessingImage.value = false;

      console.log('Image processed successfully:', uniqueName);
    } catch (error) {
      console.error('Error processing image:', error);
      alert(error instanceof Error ? error.message : 'Failed to process image');
      isProcessingImage.value = false;
      throw error;
    }
  });

  // Handle file upload from input
  const handleImageUpload = $(async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        await processImageFile(input.files[0]);
      } catch (error) {
        input.value = ''; // Clear the input on error
      }
    }
  });

  // Apply current crop coordinates to generate new preview
  const applyCrop = $(() => {
    if (!loadedImage.value) return;

    const targetWidth = parseInt(formData.modalWidth) || 300;
    const targetHeight = parseInt(formData.modalHeight) || 300;
    const img = loadedImage.value;
    const coords = cropCoords.value;

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

      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
      formData.imagePreview = dataURL;
      formData.value_image = dataURL;
    }
  });

  // Toggle manual crop mode
  const toggleManualCrop = $(() => {
    showManualCrop.value = !showManualCrop.value;
  });

  // Reset to smartcrop result
  const resetToSmartCrop = $(() => {
    if (smartCropBackup.value) {
      formData.imagePreview = smartCropBackup.value;
      formData.value_image = smartCropBackup.value;
      showManualCrop.value = false;
    }
  });

  // Adjust crop position
  const adjustCropPosition = $((dx: number, dy: number) => {
    if (!loadedImage.value) return;

    const img = loadedImage.value;
    const coords = cropCoords.value;

    // Calculate new position (stay within image bounds)
    const newX = Math.max(0, Math.min(img.width - coords.width, coords.x + dx));
    const newY = Math.max(0, Math.min(img.height - coords.height, coords.y + dy));

    cropCoords.value = { ...coords, x: newX, y: newY };
    applyCrop();
  });

  // Handle mouse drag on crop preview
  const handleCropMouseDown = $((event: MouseEvent) => {
    if (!showManualCrop.value) return;
    event.preventDefault();
    isDraggingCrop.value = true;
    dragStart.value = { x: event.clientX, y: event.clientY };
  });

  const handleCropMouseMove = $((event: MouseEvent) => {
    if (!isDraggingCrop.value || !loadedImage.value) return;
    event.preventDefault();

    const dx = event.clientX - dragStart.value.x;
    const dy = event.clientY - dragStart.value.y;

    dragStart.value = { x: event.clientX, y: event.clientY };

    // Move crop area (inverted - dragging image moves opposite direction)
    adjustCropPosition(-dx * 2, -dy * 2);
  });

  const handleCropMouseUp = $(() => {
    isDraggingCrop.value = false;
  });

  // Handle scroll zoom on crop preview
  const handleCropWheel = $((event: WheelEvent) => {
    if (!showManualCrop.value || !loadedImage.value) return;
    event.preventDefault();

    const img = loadedImage.value;
    const coords = cropCoords.value;
    const targetWidth = parseInt(formData.modalWidth) || 300;
    const targetHeight = parseInt(formData.modalHeight) || 300;

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
    cropCoords.value = { x: newX, y: newY, width: newWidth, height: newHeight };
    applyCrop();
  });
  const handleDragOver = $((event: DragEvent) => {
    event.preventDefault();
    isDragging.value = true;
  });

  const handleDragLeave = $((event: DragEvent) => {
    event.preventDefault();
    isDragging.value = false;
  });

  const handleDrop = $(async (event: DragEvent) => {
    event.preventDefault();
    isDragging.value = false;

    const files = event.dataTransfer?.files;
    if (files && files[0]) {
      try {
        await processImageFile(files[0]);
      } catch (error) {
        // Error already handled in processImageFile
      }
    }
  });

  // Helper function to convert data URL to File object (using $() for Qwik serialization)
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

  // Handle form submit
  const handleSubmit = $(() => {
    // console.log('Form submitted:', formData);
    // 1. text-only
    // 2. image
    // content type:
    // LOGO = 1,       // Logo
    // SLIDESHOW = 2,  // Slideshow
    // CONTENT = 3,    // Content

    if (formData.modalType === '1') {
      if (formData.modalTitle.trim() !== formData.value_text.trim()) {
        // proses ini hanya update saja, tidak ada insert baru
        contentApi.updateContentByCode(formData.modalCode, {
          template: 1,
          code: formData.modalCode,
          value_type: formData.modalType,
          value_text: formData.value_text,
          content_type: 3,
        }).then((updatedContent) => {
          console.log('Content updated:', updatedContent);
        }).catch((error) => {
          console.error('Error updating content:', error);
        });
      }
      else {
        console.log('Nothing is change:');
      };
    }
    else if (formData.modalType === '2') {
      // Check if either text or image has changed
      // const textChanged = formData.modalTitle.trim() !== formData.value_text.trim();
      const imageChanged = formData.value_image && formData.value_image !== '';

      // console.log('textChanged', textChanged);
      console.log('imageChanged', imageChanged);

      // if (textChanged || imageChanged) {
      if (imageChanged) {
        // proses ini hanya update saja, tidak ada insert baru
        const updateData: any = {
          template: 1,
          code: formData.modalCode,
          value_type: formData.modalType,
          value_text: formData.value_text,
          value_image: formData.value_image,
          content_type: 3,
        };

        contentApi.updateContentByCode(formData.modalCode, updateData)
          .then(async (updatedContent) => {
            // console.log('Content updated:', updatedContent);

            // Handle photo creation/update if image changed
            console.log('updatedContent.encrypted_id', updatedContent.encrypted_id);
            if (updatedContent.encrypted_id) {
              try {
                // Convert base64 to File object
                const imageFile = await dataURLtoFile(formData.value_image, formData.processedFileName);
                console.log('Uploading image file:', imageFile);

                // Use dynamic ContentType ID from backend
                isUploadingPhoto.value = true;

                // Check if content already has photos
                // const existingPhotos = updatedContent.value_image;
                // console.log('existingPhotos', existingPhotos);

                // if (existingPhotos && existingPhotos.length > 0) {
                //   // Update existing photo
                //   const photoId = existingPhotos[0].id;
                //   if (photoId) {
                //     await photoApi.updatePhoto(photoId, {
                //       content_type: contentTypeId.value,
                //       object_id: updatedContent.encrypted_id,
                //       image: imageFile,
                //       title: formData.value_text || 'Image',
                //       alt_text: formData.value_text || 'Image'
                //     });
                //     console.log('Photo updated:', photoId);
                //     showNotification('Photo updated successfully!', 'success');
                //   }
                // } else {

                // Delete photo if exists
                const delPhoto = await photoApi.deletePhotoByObjectId(updatedContent.encrypted_id);
                console.log('Photo deleted (if existed):', delPhoto);

                // Create new photo
                const newPhoto = await photoApi.createPhoto({
                  content_type: contentTypeId.value,
                  object_id: updatedContent.encrypted_id,
                  image: imageFile,
                  title: imageTitle.value || formData.value_text || 'Image',
                  alt_text: formData.value_text || 'Image'
                });
                console.log('Photo created:', newPhoto);
                showNotification('Photo uploaded successfully!', 'success');
                // }
                isUploadingPhoto.value = false;
              } catch (photoError) {
                console.error('Error handling photo:', photoError);
                isUploadingPhoto.value = false;
                showNotification('Failed to upload photo. Please try again.', 'error');
              }
            }
          }).catch((error) => {
            console.error('Error updating content:', error);
            showNotification('Failed to update content. Please try again.', 'error');
          });
      }
      else {
        console.log('Nothing is change:');
      };
    };

    closeModal();
  });

  // Fetch ContentType ID from backend on mount
  useVisibleTask$(async () => {
    try {
      const id = await photoApi.getContentTypeId();
      contentTypeId.value = id;
      console.log('ContentType ID fetched:', id);
    } catch (error) {
      console.error('Failed to fetch ContentType ID, using default (7):', error);
      // Keep using default value of 7
    }
  });



  // Auto focus ke input pertama saat modal dibuka
  useVisibleTask$(({ track }) => {
    track(() => showContent.value);
    if (showContent.value && firstInputRef.value) {
      // Delay to ensure DOM is ready
      setTimeout(() => {
        firstInputRef.value?.focus();
      }, 100);
    }
  });

  // Shortcut ESC untuk menutup modal
  useVisibleTask$(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal.value) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <>
      <div class="relative inline-block group active:bg-transparent">
        <Slot />
        <button onClick$={openModal}
          class="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 rounded shadow-lg 
                      text-xs font-semibold hover:bg-purple-700 opacity-0 group-hover:opacity-90 group-active:opacity-90
                      transition-all duration-200 hover:scale-110 cursor-pointer"
          title="Tombol ini hanya muncul di mode edit">
          🎨 Edit
        </button>
      </div>

      {/* Overlay + Modal */}
      {showModal.value && (
        <div
          class={`
            fixed inset-0 z-[99999] overflow-y-auto
            ${showModal.value ? 'block' : 'hidden'}
          `}
        >
          {/* Overlay Background */}
          <div
            onClick$={handleOutsideClick}
            class={`
              fixed inset-0 bg-black/70 modal-overlay
              transition-opacity duration-300 ease-out
              ${showContent.value ? 'opacity-100' : 'opacity-0'}
            `}
          />

          {/* Modal Container */}
          <div class="flex items-center justify-center min-h-screen p-4">
            {/* Modal Content */}
            <div
              class={`
                relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto
                transition-all duration-300 ease-out
                ${showContent.value ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
              `}
            >
              {/* Header */}
              <div class="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-800">
                  <svg
                    class="w-5 h-5 inline mr-2 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Mode Edit - [Khusus Admin Website]
                </h3>
                <button
                  onClick$={closeModal}
                  class="text-gray-500 hover:text-gray-700 transition duration-200 cursor-pointer"
                >
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div class="p-4">
                <form preventdefault:submit>
                  <p class="text-gray-600 mb-4 text-sm">
                    Update data berikut, maka pengunjung website langsung melihat perubahan!
                    Silahkan
                    <a class="text-indigo-600 hover:text-indigo-800 font-medium ml-1" href="#">
                      Logout </a> untuk melihat perubahan tersebut.
                  </p>

                  {/* Hidden inputs */}
                  <input
                    id="modalTitle"
                    name="modalTitle"
                    type="hidden"
                    value={formData.modalTitle}
                    onInput$={(e) => formData.modalTitle = (e.target as HTMLInputElement).value}
                  />
                  <input
                    id="modalCode"
                    name="modalCode"
                    type="hidden"
                    value={formData.modalCode}
                    onInput$={(e) => formData.modalCode = (e.target as HTMLInputElement).value}
                  />
                  <input
                    id="modalType"
                    name="modalType"
                    type="hidden"
                    value={formData.modalType}
                    onInput$={(e) => formData.modalType = (e.target as HTMLInputElement).value}
                  />
                  <input
                    id="modalWidth"
                    name="modalWidth"
                    type="hidden"
                    value={formData.modalWidth}
                    onInput$={(e) => formData.modalWidth = (e.target as HTMLInputElement).value}
                  />
                  <input
                    id="modalHeight"
                    name="modalHeight"
                    type="hidden"
                    value={formData.modalHeight}
                    onInput$={(e) => formData.modalHeight = (e.target as HTMLInputElement).value}
                  />

                  <div class="space-y-4">
                    {/* Text Input */}

                    {formData.modalType === '1' && (
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-1"
                          for="value_text"
                        >
                          Edit Teks
                        </label>
                        <input
                          ref={firstInputRef}
                          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition duration-200"
                          id="value_text"
                          name="value_text"
                          placeholder="Ubah Data"
                          required
                          type="text"
                          value={formData.value_text}
                          onInput$={(e) => formData.value_text = (e.target as HTMLInputElement).value}
                        />
                      </div>
                    )}

                    {/* Image Input */}
                    {formData.modalType === '2' && (
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-1"
                          for="value_image"
                        >
                          Gambar saat ini (Dimensi
                          <span class="font-medium"> {formData.modalWidth} </span>
                          x
                          <span class="font-medium"> {formData.modalHeight} </span>
                          Pixel)
                          <p class="text-gray-500 text-xs mt-2">
                            Gambar akan otomatis di-crop dan di-resize ke dimensi
                            <br />
                            <span class="font-medium"> {formData.modalWidth} </span>
                            x
                            <span class="font-medium"> {formData.modalHeight} </span>
                            Pixel menggunakan Smart Crop
                          </p>
                        </label>

                        {/* Current Image */}
                        {formData.modalTitle && (
                          <div class="flex items-center justify-center w-full mt-2">
                            <img
                              src={formData.modalTitle}
                              alt="Preview"
                              class="max-h-32 rounded-lg mx-auto"
                              title="Gambar saat ini"
                            />
                          </div>
                        )}

                        <label
                          class="block text-sm font-medium text-gray-700 mb-1 mt-4"
                          for="value_image"
                        >
                          Unggah Gambar
                        </label>



                        {/* File Upload Area with Drag & Drop */}
                        <div class="flex items-center justify-center w-full">
                          <label
                            class={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition duration-200 ${isProcessingImage.value
                              ? 'bg-blue-50 cursor-wait border-blue-400'
                              : isDragging.value
                                ? 'bg-indigo-50 cursor-pointer border-indigo-500'
                                : 'cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300'
                              }`}
                            for="value_image"
                            onDragOver$={handleDragOver}
                            onDragLeave$={handleDragLeave}
                            onDrop$={handleDrop}
                          >
                            <div class="flex flex-col items-center justify-center pt-5 pb-6">
                              {isProcessingImage.value ? (
                                <>
                                  <svg
                                    class="w-8 h-8 text-blue-500 mb-2 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      class="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      stroke-width="4"
                                    />
                                    <path
                                      class="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  <p class="mb-2 text-sm text-blue-600 font-semibold">
                                    Processing image... {processingProgress.value}%
                                  </p>
                                  {/* Progress Bar */}
                                  <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={`width: ${processingProgress.value}%`}
                                    ></div>
                                  </div>
                                  <p class="text-xs text-blue-500 mt-2">
                                    Applying smart crop
                                  </p>
                                </>
                              ) : (
                                <>
                                  <svg
                                    class="w-8 h-8 text-gray-400 mb-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                  </svg>
                                  <p class="mb-2 text-sm text-gray-500">
                                    <span class="font-semibold">
                                      {isDragging.value ? 'Drop image here' : 'Klik untuk upload'}
                                    </span>
                                    {!isDragging.value && (
                                      <span class="block mt-1 text-xs">atau drag & drop</span>
                                    )}
                                  </p>
                                  <p class="text-xs text-gray-500">
                                    PNG, JPG, GIF, WebP (MAX. 5MB)
                                  </p>
                                </>
                              )}
                            </div>
                            <input
                              onChange$={handleImageUpload}
                              accept="image/*"
                              class="hidden"
                              id="value_image"
                              name="value_image"
                              type="file"
                              disabled={isProcessingImage.value}
                            />
                          </label>
                        </div>

                        {/* Image Title Input */}
                        <div class="mb-3">
                          <label
                            class="block text-xs font-medium text-gray-600 mb-1"
                            for="image_title"
                          >
                            Image Title (Optional)
                          </label>
                          <input
                            type="text"
                            id="image_title"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition duration-200"
                            placeholder="Enter image title"
                            value={imageTitle.value}
                            onInput$={(e) => imageTitle.value = (e.target as HTMLInputElement).value}
                          />
                        </div>                        

                        {/* Image Preview Comparison */}
                        {formData.imagePreview && loadedImage.value && (
                          <div class="mt-4">
                            <h4 class="text-sm font-medium text-gray-700 mb-2">Preview Comparison</h4>
                            <div class="grid grid-cols-2 gap-2">
                              {/* Original Image */}
                              {originalImagePreview.value && (
                                <div class="border border-gray-200 rounded-lg overflow-hidden">
                                  <div class="bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                    Original ({formData.modalWidth} x {formData.modalHeight})
                                  </div>
                                  <div class="p-2 bg-white flex items-center justify-center">
                                    <img
                                      src={originalImagePreview.value}
                                      alt="Original"
                                      class="max-h-32 rounded"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Cropped Image */}
                              <div class="border border-indigo-200 rounded-lg overflow-hidden">
                                <div class="bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 flex justify-between items-center">
                                  <span>Smart Cropped ✓</span>
                                  <div class="flex items-center gap-2">
                                    {showManualCrop.value && (
                                      <>
                                        <span class="text-orange-600 text-xs">● Manual Mode</span>
                                        <span class="text-gray-600 text-xs">Zoom: {Math.round(zoomLevel.value * 100)}%</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div
                                  class={`p-2 bg-white flex items-center justify-center relative ${showManualCrop.value ? (isDraggingCrop.value ? 'cursor-grabbing' : 'cursor-grab') : ''
                                    }`}
                                  onMouseDown$={handleCropMouseDown}
                                  onMouseMove$={handleCropMouseMove}
                                  onMouseUp$={handleCropMouseUp}
                                  onMouseLeave$={handleCropMouseUp}
                                  onWheel$={handleCropWheel}
                                  style="user-select: none;"
                                >
                                  <img
                                    src={formData.imagePreview}
                                    alt="Cropped Preview"
                                    class="max-h-32 rounded border"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Manual Crop Controls */}
                            {formData.imagePreview && loadedImage.value && (
                              <div class="mt-3 border-t pt-3">
                                <div class="flex gap-2 items-center justify-between">
                                  <button
                                    type="button"
                                    onClick$={toggleManualCrop}
                                    class={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${showManualCrop.value
                                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                  >
                                    {showManualCrop.value ? '📐 Adjusting...' : '🔧 Adjust Crop'}
                                  </button>

                                  {showManualCrop.value && (
                                    <button
                                      type="button"
                                      onClick$={resetToSmartCrop}
                                      class="px-3 py-1.5 rounded text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                    >
                                      ↺ Reset to Smart Crop
                                    </button>
                                  )}
                                </div>

                                {/* Instructions */}
                                {showManualCrop.value && (
                                  <div class="mt-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 border border-indigo-100">
                                    <p class="text-sm text-indigo-800 font-medium mb-1.5">
                                      🖱️ Drag & Scroll to Adjust
                                    </p>
                                    <ul class="text-xs text-indigo-600 space-y-1">
                                      <li>• <b>Drag</b> the image to reposition</li>
                                      <li>• <b>Scroll</b> mouse wheel to zoom in/out</li>
                                      <li>• Zoom range: 50% - 300%</li>
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <hr class="my-6" />

                  <div class="flex justify-end">
                    <button
                      onClick$={handleSubmit}
                      class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200 flex items-center cursor-pointer"
                      type="submit"
                    >
                      <svg
                        class="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast.value && (
        <div
          class={`fixed top-4 right-4 z-[100000] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${toastType.value === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
            }`}
        >
          <div class="flex items-center gap-2">
            {toastType.value === 'success' ? (
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span class="font-medium">{toastMessage.value}</span>
          </div>
        </div>
      )}
    </>
  );
});
