import { component$, useStore, useSignal, useVisibleTask$, useStylesScoped$ } from "@builder.io/qwik";
// useContext
// import { useNavigate, useLocation } from '@builder.io/qwik-city';
import { ModalForm } from "../modalForm";
import { contentApi } from "~/services/api";


export const LogoImage = component$(() => {
  useStylesScoped$(`
    .logo-image {
      background: transparent;
      mix-blend-mode: multiply;
      filter: contrast(1.1) brightness(1.1);
    }
  `);

  const code = useSignal("GHHrrNrXYRDkkWuwZyYbEoIsSdZhCHDwtzvn2jD2elHbc0RgljqE7xd"); // logo-text-01
  const type = useSignal(2); // 1 = text
  const template = useSignal(1); // 1 = index template

  const formData = useStore({
    modalCode: code.value,
    modalType: String(type.value),
    modalTitle: "",
    modalWidth: String(363),
    modalHeight: String(361),
    value_text: "",
    value_textarea: '',
    value_image: '',
    processedFileName: '',
    imagePreview: '',
  });

  // Load data dari database disini
  // create if not exist
  useVisibleTask$(() => {
    contentApi.getContentByCode(code.value).then((data) => {
      // console.log('data', data) ;
      // site: global.id,
      if (!data) {
        contentApi.createContentCustom({
          template: template.value,
          code: code.value,
          value_type: type.value,
          value_text: "Logo Image",
        }).then((newData) => {
          console.log(`Created default content for ${code.value}`, newData);
          // formData.modalTitle = newData.value_text || "";
          // formData.value_text = newData.value_text || "";        

          // Full reload from the server
          // window.location.reload();
          // Reload page to fetch the newly created content with photo
          setTimeout(() => {
            window.location.reload();
          }, 1000);

          // softReload;
        }).catch((error) => {
          console.error(`Error creating default content for ${code.value}:`, error);
        });
      }
      else {
        console.log(`Content found for ${code.value}:`, data);
        // formData.modalTitle = data.value_text || "";
        // formData.value_text = data.value_text || "";

        // Load image from value_image if available
        // if (data.value_image && data.value_image.length > 0) {
        //   formData.imagePreview = data.value_image[0].image || "";
        //   // formData.modalTitle = photos[0].image || "";
        // }

        // Also fetch photos by object_id
        // if (data.encrypted_code) {
        //   photoApi.getPhotoByObjectId(data.encrypted_code).then((photos) => {
        //     console.log(`Photos fetched for object_id ${data.encrypted_code}:`, photos);
        //     if (photos && photos.length > 0) {
        //       formData.imagePreview = photos[0].image || "";
        //       formData.modalTitle = photos[0].image || "";
        //       console.log('Updated formData with photo image:', formData.modalTitle);
        //     }
        //   }).catch((error) => {
        //     console.error(`Error fetching photos for object_id ${data.encrypted_code}:`, error);
        //   });
        // };
        if (data.images.length > 0) {
          formData.imagePreview = data.images[0].image || "";
          formData.modalTitle = data.images[0].image || "";
        };

      };
    });
  });

  // Determine the image URL to display
  const imageUrl = formData.imagePreview || null;

  // Only render if image is loaded
  if (!imageUrl) {
    return null;
  }

  return (
    <ModalForm formData={formData}>
      <img src={imageUrl}
        alt={formData.modalTitle || "Logo Image"} class="w-8 h-8 shrink-0 object-cover bg-transparent logo-image" />


      {/* <div class="relative inline-block group">
          <div class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
          OverlayDemo
          </div>
          <button class="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 rounded shadow-lg text-xs font-semibold hover:bg-purple-700 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
          🎨 Brand
          </button> 🎨
      </div>     */}
    </ModalForm>
  );
}); 