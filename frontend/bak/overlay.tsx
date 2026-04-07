import { component$, Slot } from '@builder.io/qwik';

// interface OverlayButtonProps {
//   overlayButton: string;
//   overlayOnClick?: string;
// };

// export const Overlay = component$<OverlayButtonProps>(({ overlayButton, overlayOnClick }) => {  
//   return (
//     <div class="relative inline-block group">
//         <Slot />                
//         <button onclick={overlayOnClick}
//             class="absolute top-0 right-0 bg-purple-600 text-white px-2 py-1 rounded shadow-lg 
//                     text-xs font-semibold hover:bg-purple-700 opacity-0 group-hover:opacity-90 
//                     transition-all duration-200 hover:scale-110 cursor-pointer"
//             title="Tombol ini hanya muncul di mode edit">
//             {overlayButton}
//             {/* 🎨 Brand */}
//         </button>
//     </div>   
//   );
// }); 