// src/components/ModalForm.tsx
import { component$, useSignal, $, useVisibleTask$, Slot } from '@builder.io/qwik';

interface OverlayButtonProps {
  overlayButton: string;
  // overlayOnClick?: string;
};

export const ModalForm = component$<OverlayButtonProps>(({ overlayButton }) => {  
  const showModal = useSignal(false);
  const name = useSignal('');
  const email = useSignal('');
  const nameInputRef = useSignal<HTMLInputElement>();

  // Fungsi submit
  const handleSubmit = $(() => {
    alert(`Nama: ${name.value}, Email: ${email.value}`);
    showModal.value = false;
  });

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
      // console.log('Key pressed:', e.key);
      if (e.key === 'Escape') {
        showModal.value = false;
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

      <div class="relative inline-block group">
          <Slot />                
          <button onClick$={() => (showModal.value = true)}
              class="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 rounded shadow-lg 
                      text-xs font-semibold hover:bg-purple-700 opacity-0 group-hover:opacity-90 
                      transition-all duration-200 hover:scale-110 cursor-pointer"
              title="Tombol ini hanya muncul di mode edit">
              {overlayButton}
              {/* 🎨 Brand */}
          </button>
      </div>   

      {/* Overlay + Modal */}
      <div
        class={`fixed inset-0 flex items-center justify-center transition-opacity duration-300 ${
          showModal.value ? 'opacity-100 visible' : 'opacity-0 invisible'
        } bg-black/50`}
      >
        <div
          class={`relative bg-white rounded-lg shadow-lg w-full max-w-md p-6 transform transition-all duration-300 ${
            showModal.value ? 'scale-100' : 'scale-95'
          }`}
        >
          {/* Tombol Close (X) */}
          <button
            class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 cursor-pointer text-xl font-bold"
            onClick$={() => (showModal.value = false)}
            aria-label="Close"
          >
            ✕
          </button>

          <h2 class="text-xl font-semibold mb-4">Form Pendaftaran</h2>
          <div class="relative inline-block group">
            <img src="../../../public/logo.png" 
              alt="Logo" class="w-12 h-12 mb-4" />
            <span class="text-sm text-gray-700 mb-2">Tekan (ESC) untuk menutup Form</span>
          </div>

          <form id="infoForm">
            <p class="text-gray-600 mb-4 text-sm">
                Update data berikut, maka pengunjung website langsung melihat perubahan!
                                    Silahkan klik
                <a class="text-indigo-600 hover:text-indigo-800 font-medium" href="#">
                Logout
                </a>
                untuk melihat perubahan tersebut.
            </p>
            <input id="modalTitle" name="modalTitle" type="hidden" x-model="smFormData.modalTitle"/>
            <input id="modalCode" name="modalCode" type="hidden" x-model="smFormData.modalCode"/>
            <input id="modalType" name="modalType" type="hidden" x-model="smFormData.modalType"/>
            <input id="modalWidth" name="modalWidth" type="hidden" x-model="smFormData.modalWidth"/>
            <input id="modalHeight" name="modalHeight" type="hidden" x-model="smFormData.modalHeight"/>
            <div class="space-y-4">
                <!-- Text Input -->
                <div x-show="smFormData.modalType === 'text'">
                <label class="block text-sm font-medium text-gray-700 mb-1" for="value_text">
                Edit Teks
                </label>
                <input class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition duration-200" 
                    id="value_text" name="value_text" placeholder="Ubah Data" required="" 
                    type="text" x-model="smFormData.value_text">
                </input>
                </div>
                <!-- Textarea Input -->
                <!-- <div x-show="smFormData.modalType === 'textarea'">
                <label class="block text-sm font-medium text-gray-700 mb-1" for="value_textarea">
                Edit Konten
                </label>
                <textarea class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition duration-200" id="value_textarea" name="value_textarea" placeholder="Ubah Data" required="" rows="6" x-model="smFormData.value_textarea"></textarea>
                </div> -->
                <!-- Image Input --> 
                <div x-show="smFormData.modalType === 'image'">
                <label class="block text-sm font-medium text-gray-700 mb-1" for="value_image">
                Gambar saat ini (Dimensi
                <span x-text="smFormData.modalWidth">
                </span>
                x
                <span x-text="smFormData.modalHeight">
                </span>
                Pixel)
                <p class="text-gray-500 text-xs mt-2">
                Untuk hasil terbaik desain gambar dengan dimensi
                <br/>
                <span x-text="smFormData.modalWidth">
                </span>
                x
                <span x-text="smFormData.modalHeight">
                </span>
                Pixel
                </p>
                </label>
                <div class="flex items-center justify-center w-full">
                <!-- @load="smGetDimensions" -->
                <img :src="smFormData.modalTitle" alt="Preview" class="max-h-32 rounded-lg mx-auto" 
                    title="Gambar saat ini" x-ref="image"/>
                </div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="value_image">
                Unggah Gambar
                </label>
                <div class="flex items-center justify-center w-full">
                <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition duration-200" for="value_image">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <i class="fas fa-cloud-upload-alt text-2xl text-gray-400 mb-2">
                    </i>
                    <p class="mb-2 text-sm text-gray-500">
                    <span class="font-semibold">
                    Klik untuk upload
                    </span>
                    </p>
                    <!-- atau drag and drop -->
                    <p class="text-xs text-gray-500">
                    PNG, JPG, GIF (MAX. 1MB)
                    </p>
                </div>
                <input @change="smHandleImageUpload" accept="image/*" class="hidden" id="value_image" name="value_image" type="file">
                </input>
                </label>
                </div>
                <div class="mt-2" x-show="smFormData.imagePreview">
                <img :src="smFormData.imagePreview" alt="Preview" class="max-h-32 rounded-lg mx-auto"/>
                </div>
                </div>
            </div>
            <hr class="my-6"/>
            <div class="flex justify-end">
                <button @click="smSubmitForm();" 
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-200 flex items-center cursor-pointer" 
                type="button">
                <i class="fas fa-paper-plane mr-2">
                </i>
                Submit
                </button>
            </div>
          </form>

          {/* <form
            preventdefault:submit
            onSubmit$={handleSubmit}
            class="space-y-4"
          >
            <div>
              <label class="block text-sm font-medium">Nama</label>
              <input
                ref={nameInputRef}
                type="text"
                class="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                bind:value={name}
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium">Email</label>
              <input
                type="email"
                class="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                bind:value={email}
                required
              />
            </div>
            <div class="flex justify-end space-x-2">
              <button
                type="button"
                class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                onClick$={() => (showModal.value = false)}
              >
                Batal
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Kirim
              </button>
            </div>
          </form> */}
        </div>
      </div>
    </>
  );
});
