// src/components/ModalForm.tsx
import { component$, useSignal, $, useVisibleTask$, Slot, useStore } from '@builder.io/qwik';

interface OverlayButtonProps {
  overlayButton: string;
  // overlayOnClick?: string;
};

// Interface untuk props modal
interface EditModalProps {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  formData: {
    modalTitle: string;
    modalCode: string;
    modalType: string;
    modalWidth: string;
    modalHeight: string;
    value_text: string;
    value_textarea: string;
    value_image: File | null;
    imagePreview: string;
  };
};

export const ModalForm = component$<EditModalProps>(({ isOpen, onOpen, onClose, formData }) => {
  // State untuk animasi
  const showModal = useSignal(false);
  const showContent = useSignal(false);

  const name = useSignal('');
  const email = useSignal('');
  const nameInputRef = useSignal<HTMLInputElement>();

  // Fungsi untuk menutup modal dengan animasi
  const closeModal = $(() => {
    showContent.value = false;
    setTimeout(() => {
      showModal.value = false;
      onClose();
    }, 200);
  });

  // Fungsi untuk membuka modal dengan animasi
  const openModal = $(() => {
    showModal.value = true;
    setTimeout(() => {
      showContent.value = true;
    }, 50);
  });


  // Handle klik di luar modal
  const handleOutsideClick = $((event: MouseEvent) => {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      closeModal();
    }
  });

  // Handle file upload
  const handleImageUpload = $((event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      formData.value_image = file;

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        formData.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle form submit
  const handleSubmit = $(() => {
    console.log('Form submitted:', formData);
    // Tambahkan logika submit di sini
    closeModal();
  });

  // Auto open/close berdasarkan prop isOpen
  useVisibleTask$(({ track }) => {
    track(() => isOpen);
    if (isOpen && !showModal.value) {
      openModal();
    } else if (!isOpen && showModal.value) {
      closeModal();
    }
  });

  const isSubmitting = useSignal(false);

  // const handleImageUpload = $((event: Event) => {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files && input.files[0]) {
  //     const file = input.files[0];
  //     formData.value_image = file;

  //     // Create preview URL
  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       formData.imagePreview = e.target?.result as string;
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // });

  // const handleSubmit = $(async () => {
  //   isSubmitting.value = true;

  //   // Simulate form submission logic
  //   console.log("Form data:", formData);

  //   // Add your actual submission logic here
  //   // For example: API call, validation, etc.

  //   // Reset after submission
  //   setTimeout(() => {
  //     isSubmitting.value = false;
  //     alert("Form submitted successfully!");
  //   }, 1000);
  // });

  // Fungsi submit
  // const handleSubmit = $(() => {
  //   alert(`Nama: ${name.value}, Email: ${email.value}`);
  //   showModal.value = false;
  // });

  // Auto focus ke input pertama saat modal dibuka
  useVisibleTask$(({ track }) => {
    console.log('Modal visibility changed', track);
    track(() => showModal.value);
    if (showModal.value && nameInputRef.value) {
      nameInputRef.value.focus();
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
      {/* Tombol buka modal */}
      {/* <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick$={() => (showModal.value = true)}
      >
        Buka Form
      </button> */}

      <div class="relative inline-block group active:bg-transparent">
        <Slot />
        <button onClick$={() => onOpen && onOpen()}
          class="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 rounded shadow-lg 
                      text-xs font-semibold hover:bg-purple-700 opacity-0 group-hover:opacity-90 group-active:opacity-90
                      transition-all duration-200 hover:scale-110 cursor-pointer"
          title="Tombol ini hanya muncul di mode edit">
          OVERLAY
          {/* 🎨 Brand */}
        </button>
      </div>

      {/* Overlay + Modal */}
      {showModal.value && (
        <div
          class={`
            fixed inset-0 z-50 overflow-y-auto
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
                    Silahkan klik
                    <a class="text-indigo-600 hover:text-indigo-800 font-medium ml-1" href="#">
                      Logout
                    </a>
                    untuk melihat perubahan tersebut.
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
                    {formData.modalType === 'text' && (
                      <div>
                        <label
                          class="block text-sm font-medium text-gray-700 mb-1"
                          for="value_text"
                        >
                          Edit Teks
                        </label>
                        <input
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

                    {/* Textarea Input (commented out) */}
                    {/* {formData.modalType === 'textarea' && (
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="value_textarea">
                          Edit Konten
                        </label>
                        <textarea 
                          class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition duration-200" 
                          id="value_textarea" 
                          name="value_textarea" 
                          placeholder="Ubah Data" 
                          required 
                          rows={6}
                          value={formData.value_textarea}
                          onInput$={(e) => formData.value_textarea = (e.target as HTMLTextAreaElement).value}
                        ></textarea>
                      </div>
                    )} */}

                    {/* Image Input */}
                    {formData.modalType === 'image' && (
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
                            Untuk hasil terbaik desain gambar dengan dimensi
                            <br />
                            <span class="font-medium"> {formData.modalWidth} </span>
                            x
                            <span class="font-medium"> {formData.modalHeight} </span>
                            Pixel
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

                        {/* File Upload Area */}
                        <div class="flex items-center justify-center w-full">
                          <label
                            class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition duration-200"
                            for="value_image"
                          >
                            <div class="flex flex-col items-center justify-center pt-5 pb-6">
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
                                  Klik untuk upload
                                </span>
                              </p>
                              <p class="text-xs text-gray-500">
                                PNG, JPG, GIF (MAX. 1MB)
                              </p>
                            </div>
                            <input
                              onChange$={handleImageUpload}
                              accept="image/*"
                              class="hidden"
                              id="value_image"
                              name="value_image"
                              type="file"
                            />
                          </label>
                        </div>

                        {/* New Image Preview */}
                        {formData.imagePreview && (
                          <div class="mt-4">
                            <img
                              src={formData.imagePreview}
                              alt="Preview"
                              class="max-h-32 rounded-lg mx-auto"
                            />
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
                      type="button"
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
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
