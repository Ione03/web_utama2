import { component$, useStore, useSignal, useVisibleTask$, type ClassList } from "@builder.io/qwik";
// useContext
// import { useNavigate, useLocation } from '@builder.io/qwik-city';
import { ModalForm } from "~/components/modalForm";
import { contentApi } from "~/services/api";
// import { GlobalContext } from "~/services/global-context";


export const CopyrightText = component$((props: { class?: ClassList }) => {
  const code = useSignal("3AfpTOUB1UhMq3K94wpS65zv71vKVCPX3kE4iR91PbRW8DEoxdwMfjGKQJdAs"); // logo-text-01
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
          value_text: "All Right Reserved.",
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
      <a href="/" class={props.class}>{formData.value_text}</a>
    </ModalForm>
  );
}); 