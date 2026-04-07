import { component$, useStore, useSignal, useVisibleTask$ } from "@builder.io/qwik";
// useContext
// import { useNavigate, useLocation } from '@builder.io/qwik-city';
import { ModalForm } from "../modalForm";
import { contentApi } from "~/services/api";
// import { GlobalContext } from "~/services/global-context";


export const LogoText = component$(() => {
  const code = useSignal("HyqVxkdtp9iT5s7fMoLVCRYaxmcyawQAhd9J7Ep9iPnsMHUWDn84eR"); // logo-text-01
  const type = useSignal(1); // 1 = text
  const template = useSignal(1); // 1 = index template

  // const global = useContext(GlobalContext);

  // const nav = useNavigate();
  // const loc = useLocation();

  // const softReload = $(async () => {
  //   await nav(loc.url.pathname); // Navigates to the same page
  // });

  const formData = useStore({
    modalCode: code.value,
    modalType: String(type.value),
    modalTitle: ". . .",
    modalWidth: String(0),
    modalHeight: String(0),
    value_text: ". . .",
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
          value_text: "Logo Text",
        }).then((newData) => {
          console.log(`Created default content for ${code.value}`, newData);
          // formData.modalTitle = newData.value_text || "";
          // formData.value_text = newData.value_text || "";        

          // Full reload from the server
          window.location.reload();
          // softReload;
        }).catch((error) => {
          console.error(`Error creating default content for ${code.value}:`, error);
        });
      }
      else {
        console.log(`Content found for ${code.value}:`, data);
        formData.modalTitle = data.value_text || "";
        formData.value_text = data.value_text || "";
      };
    });
  });

  // Only render if text is loaded (not the placeholder)
  if (!formData.value_text || formData.value_text === ". . .") {
    return null;
  }

  return (
    <ModalForm formData={formData}>
      <div class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
        <a href="/">{formData.value_text}</a>
      </div>
    </ModalForm>
  );
}); 