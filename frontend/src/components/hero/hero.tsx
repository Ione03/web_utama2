import { component$, useSignal, useVisibleTask$, useStore, $ } from "@builder.io/qwik";
import { ModalForm } from "../modalForm";
import { ContentModal } from "../content-modal/content-modal";
import { contentApi, ContentTypeChoice, photoApi } from "~/services/api";
import { useLocation } from '@builder.io/qwik-city';

export const Hero = component$((props: { currentUser?: any, isContentModalOpen?: any }) => {
  const { currentUser, isContentModalOpen } = props;
  const type = useSignal(2); // 2 = image
  const template = useSignal(1); // 1 = index template

  const formData = useStore({
    modalCode: '',
    modalType: String(type.value),
    modalTitle: "",
    modalWidth: String(1280),
    modalHeight: String(720),
    value_text: "",
    value_textarea: '',
    value_image: '',
    processedFileName: '',
    imagePreview: '',
  });

  // Hero Slideshow - parent-child structure
  const heroCurrentSlide = useSignal(0);
  const heroIsPlaying = useSignal(true);

  // Parent slideshow code
  const slideshowParentCode = '3OwGkZiiaYC8h1KNpcYA8WYIVnhq9ijOEgX8CYvxILz6JAFWpcfovZAJRKkFfx';

  // Initialize empty slides array (will be populated from database)
  type SlideData = { code: string; url: string; encrypted_code: string };
  const heroSlides = useStore<SlideData[]>([]);

  // Button states
  const isAddingSlideshow = useSignal(false);
  const isDeletingSlideshow = useSignal(false);

  // Scroll-based button visibility
  const showSlideshowButton = useSignal(true);
  const showContentButton = useSignal(false);

  // Get the current location object
  const loc = useLocation();
  const domainName = useSignal(loc.url.origin);


  // Scroll detection for button visibility toggle
  useVisibleTask$(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const breakingNewsSection = document.getElementById('breakingnews');

      if (breakingNewsSection) {
        const rect = breakingNewsSection.getBoundingClientRect();
        // Only toggle if user has scrolled AND breaking news is in view
        // Show content button when scrolled down to breaking news section
        if (scrollY > 50 && rect.top <= 100) {
          showSlideshowButton.value = false;
          showContentButton.value = true;
        } else {
          showSlideshowButton.value = true;
          showContentButton.value = false;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check - but only after a small delay to ensure DOM is ready
    setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });

  // Load parent slideshow and its children from database
  useVisibleTask$(() => {
    // Extract the domain (host) from the URL
    // const domainName = loc.url.origin;
    console.log('Current domain:', domainName.value);

    contentApi.getContentByCode(slideshowParentCode).then((parentData) => {
      if (!parentData) {
        console.log(`Parent slideshow not found, creating: ${slideshowParentCode}`);

        // Create default parent if not exists
        contentApi.createContentCustom({
          template: template.value,
          code: slideshowParentCode,
          value_type: type.value,
          value_text: "Slideshow Image",
        }).then(async (newData) => {
          console.log(`Created default content for ${slideshowParentCode}`, newData);

          try {
            // Get ContentType ID for Content model
            const contentTypeId = await photoApi.getContentTypeId();
            console.log('ContentType ID:', contentTypeId);

            // Fetch default image from server
            const defaultImageUrl = `${domainName.value}/media/images/default/hero_slide_1.png`;
            const response = await fetch(defaultImageUrl);
            const blob = await response.blob();

            // Convert blob to File object
            const defaultImageFile = new File([blob], 'hero_slide_1.png', { type: blob.type });

            // Create photo linked to the new content
            const newPhoto = await photoApi.createPhoto({
              content_type: contentTypeId,
              object_id: newData.data.encrypted_id,
              image: defaultImageFile,
              title: 'Hero Slideshow Image 1',
              alt_text: 'Hero Slideshow Image 1'
            });

            console.log('Default photo created:', newPhoto);

            // Reload page to fetch the newly created content with photo
            setTimeout(() => {
              window.location.reload();
            }, 1000);

          } catch (photoError) {
            console.error('Error creating default photo:', photoError);
          }
        }).catch((error) => {
          console.error(`Error creating default content for ${slideshowParentCode}:`, error);
        });

        return; // Exit early since we need to reload
      }

      // Clear existing slides
      heroSlides.splice(0, heroSlides.length);

      // Add parent slide first
      const parentSlide: SlideData = {
        code: slideshowParentCode,
        encrypted_code: parentData.encrypted_code || '',
        url: parentData.images && parentData.images.length > 0
          ? parentData.images[0].image
          : ''
      };
      heroSlides.push(parentSlide);

      // Add children slides
      if (parentData.children && parentData.children.length > 0) {
        parentData.children.forEach((child: any) => {
          const childSlide: SlideData = {
            code: child.encrypted_code || '',  // Use encrypted_code from API
            encrypted_code: child.encrypted_code || '',
            url: child.images && child.images.length > 0
              ? child.images[0].image
              : ''
          };
          heroSlides.push(childSlide);
        });
      }

      // Initialize formData with first slide
      if (heroSlides.length > 0) {
        formData.modalCode = heroSlides[0].encrypted_code;
        formData.modalTitle = heroSlides[0].url;
        formData.imagePreview = heroSlides[0].url;
      }

      console.log(`Loaded ${heroSlides.length} slides (1 parent + ${parentData.children?.length || 0} children)`);
    }).catch((error) => {
      console.error(`Error loading slideshow: `, error);
    });
  });

  // ==================== HERO SLIDESHOW LOGIC ====================

  // Track mouse hover state
  const isMouseHovering = useSignal(false);
  const hoverTimeout = useSignal<number | null>(null);

  // Handle mouse move - pause slideshow for 3 seconds
  const handleMouseMove = $(() => {
    isMouseHovering.value = true;

    // Clear existing timeout
    if (hoverTimeout.value !== null) {
      clearTimeout(hoverTimeout.value);
    }

    // Set new timeout to resume after 3 seconds of no mouse movement
    hoverTimeout.value = window.setTimeout(() => {
      isMouseHovering.value = false;
      hoverTimeout.value = null;
    }, 3000);
  });

  const updateFormData = $(() => {
    if (heroSlides.length > 0 && heroCurrentSlide.value < heroSlides.length) {
      const currentSlide = heroSlides[heroCurrentSlide.value];
      formData.modalTitle = currentSlide.url;
      formData.modalCode = currentSlide.encrypted_code;
      formData.imagePreview = currentSlide.url;
      // console.log('hero code updated to:', formData.modalCode);
    }
  });

  useVisibleTask$(({ cleanup, track }) => {
    // Track these signals to re-run when they change
    track(() => heroIsPlaying.value);
    track(() => isMouseHovering.value);

    // Only play if not hovering and play mode is on
    if (!heroIsPlaying.value || isMouseHovering.value) return;

    const interval = setInterval(() => {
      heroCurrentSlide.value = (heroCurrentSlide.value + 1) % heroSlides.length;
      updateFormData();
    }, 3000);

    cleanup(() => clearInterval(interval));
  });

  const heroPrevSlide = $(() => {
    heroCurrentSlide.value = (heroCurrentSlide.value - 1 + heroSlides.length) % heroSlides.length;
    updateFormData();
  });

  const heroNextSlide = $(() => {
    heroCurrentSlide.value = (heroCurrentSlide.value + 1) % heroSlides.length;
    updateFormData();
  });

  const heroTogglePlayPause = $(() => {
    heroIsPlaying.value = !heroIsPlaying.value;
  });

  const heroGoToSlide = $((index: number) => {
    heroCurrentSlide.value = index;
    updateFormData();
  });

  // for button add slide show
  const AddSlideShow = $(() => {
    // Disable button immediately
    isAddingSlideshow.value = true;

    contentApi.getContentByCode(slideshowParentCode).then((parentData) => {
      if (!parentData) {
        console.log(`Parent slideshow not found, creating: ${slideshowParentCode}`);
        isAddingSlideshow.value = false;
        return;
      }
      else {
        // console.log('parentData',parentData.images.length); // cek jumlah anaknya
        // const numChildren = parentData.children ? parentData.children.length : 0;
        // console.log(`Number of children slides: ${numChildren}`);
        console.log('parentData', parentData);

        // Create default parent if not exists
        contentApi.createContentCustom({
          template: template.value,
          code: parentData.next_code,
          value_type: type.value,
          value_text: "Slideshow Image",
          parent: parentData.encrypted_id,
          content_type: ContentTypeChoice.SLIDESHOW,
        }).then(async (newData) => {
          console.log(`Created New content for `, newData.encrypted_code);

          try {
            // Get ContentType ID for Content model
            const contentTypeId = await photoApi.getContentTypeId();
            console.log('ContentType ID:', contentTypeId);

            // Fetch default image from server
            const defaultImageUrl = `${domainName.value}/media/images/default/hero_slide_${parentData.image_index}.png`;
            console.log('Default Image URL:', defaultImageUrl);

            const response = await fetch(defaultImageUrl);
            console.log('Default Image URL:', response);
            const blob = await response.blob();
            console.log('Default Image URL:', blob);

            // Convert blob to File object
            const defaultImageFile = new File([blob], `hero_slide_${parentData.image_index}.png`, { type: blob.type });
            console.log('Default Image File:', defaultImageFile);

            // Create photo linked to the new content
            const newPhoto = await photoApi.createPhoto({
              content_type: contentTypeId,
              object_id: newData.encrypted_id,
              image: defaultImageFile,
              title: 'Hero Slideshow Image',
              alt_text: 'Hero Slideshow Image'
            });

            console.log('New photo created:', newPhoto);

            // Reload page to fetch the newly created content with photo
            setTimeout(() => {
              window.location.reload();
            }, 1000);

          } catch (photoError) {
            console.error('Error creating default photo:', photoError);
            isAddingSlideshow.value = false;
          }
        }).catch((error) => {
          console.error(`Error creating default content for ${slideshowParentCode}:`, error);
          isAddingSlideshow.value = false;
        });

        return; // Exit early since we need to reload
      }

    }).catch((error) => {
      console.error(`Error loading slideshow: `, error);
      isAddingSlideshow.value = false;
    });
  });

  // Delete current slideshow (only children, never the parent)
  const DeleteSlideShow = $(() => {
    // Cannot delete if only parent slide exists
    if (heroSlides.length <= 1) {
      alert('Cannot delete the parent slideshow. At least one slide must remain.');
      return;
    }

    // Cannot delete if current slide is the parent (index 0)
    if (heroCurrentSlide.value === 0) {
      alert('Cannot delete the parent slideshow. Please select a child slide to delete.');
      return;
    }

    const currentSlide = heroSlides[heroCurrentSlide.value];
    const confirmDelete = confirm(`Are you sure you want to delete this slideshow?`);

    if (!confirmDelete) {
      return;
    }

    // Disable button and set loading state
    isDeletingSlideshow.value = true;

    // Delete the content by encrypted code
    contentApi.deleteContentByCode(currentSlide.encrypted_code)
      .then(async () => {
        console.log('Slideshow deleted:', currentSlide.encrypted_code);

        try {
          // Also delete associated photos
          await photoApi.deletePhotoByObjectId(currentSlide.encrypted_code);
          console.log('Associated photos deleted');
        } catch (photoError) {
          console.error('Error deleting photos (may not exist):', photoError);
        }

        // Reload page to refresh the slideshow list
        setTimeout(() => {
          window.location.reload();
        }, 500);
      })
      .catch((error) => {
        console.error('Error deleting slideshow:', error);
        alert('Failed to delete slideshow. Please try again.');
        isDeletingSlideshow.value = false;
      });
  });

  // Determine the image URL to display
  // const imageUrl = formData.imagePreview || null;

  return (
    <>
      {/* Content Creation Button - Visible after breaking news AND only when authenticated */}
      {showContentButton.value && currentUser && (
        <div class="fixed top-24 left-4 z-50">
          <ContentModal
            heroIsPlaying={heroIsPlaying}
            currentUser={currentUser}
            isContentModalOpen={isContentModalOpen}
            onSave$={$(() => {
              // Reload page to show new content
              window.location.reload();
            })}
          >
            <button class="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 w-[140px] cursor-pointer">
              <span>📝</span>
              <span>Content</span>
            </button>
          </ContentModal>
        </div>
      )}

      {/* Slideshow Button - Visible in hero section AND only when authenticated */}
      {/* && heroSlides && heroSlides.length > 0 */}
      {showSlideshowButton.value && currentUser && (
        <div class="fixed top-24 left-4 z-50">
          {/* Consolidated Slideshow Controls Button */}
          <div class="relative group">
            {/* Main Button */}
            <ModalForm
              formData={formData}
              heroIsPlaying={heroIsPlaying}
            >
              <button class="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 w-[140px]">
                <span>⚙️</span>
                <span>Slideshow</span>
              </button>
            </ModalForm>

            {/* Hover Menu */}
            <div class="absolute left-full ml-2 top-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              <div class="bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px]">

                {/* Add Slideshow Option */}
                <button
                  onClick$={AddSlideShow}
                  type="button"
                  disabled={isAddingSlideshow.value}
                  class={`w-full px-4 py-3 text-left flex items-center gap-2 transition-colors ${isAddingSlideshow.value
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                    }`}
                >
                  <span>{isAddingSlideshow.value ? '⏳' : '➕'}</span>
                  <span>{isAddingSlideshow.value ? 'Adding...' : 'Add Slideshow'}</span>
                </button>

                {/* Divider */}
                <div class="border-t border-gray-200"></div>

                {/* Delete Slideshow Option */}
                <button
                  onClick$={DeleteSlideShow}
                  type="button"
                  disabled={isDeletingSlideshow.value || heroSlides.length <= 1 || heroCurrentSlide.value === 0}
                  class={`w-full px-4 py-3 text-left flex items-center gap-2 transition-colors ${isDeletingSlideshow.value || heroSlides.length <= 1 || heroCurrentSlide.value === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-red-600 hover:bg-red-50 cursor-pointer'
                    }`}
                >
                  <span>{isDeletingSlideshow.value ? '⏳' : '🗑️'}</span>
                  <span>{isDeletingSlideshow.value ? 'Deleting...' : 'Delete Slideshow'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      {/* Hero Section with Slideshow */}
      {/* Button to edit image slide show */}

      {heroSlides && heroSlides.length > 0 && (
        <section
          class="pt-24 pb-16 relative overflow-hidden min-h-screen flex items-center"
          onMouseMove$={handleMouseMove}
        >
          {/* Slideshow Backgrounds with Edit Buttons */}
          {
            heroSlides.map((slide, idx) => (
              <div
                key={slide.code}
                class={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 z-0 group ${heroCurrentSlide.value === idx ? 'opacity-100' : 'opacity-0'
                  }`}
                style={`background-image: url('${slide.url}')`}
              >
                {/* Edit Button Overlay - Only for authenticated users and current slide */}
                {currentUser && heroCurrentSlide.value === idx && (
                  <div class="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ContentModal
                      mode="edit"
                      contentCode={slide.encrypted_code}
                      heroIsPlaying={heroIsPlaying}
                      currentUser={currentUser}
                      isContentModalOpen={isContentModalOpen}
                    >
                      <button class="px-4 py-2 bg-white/90 backdrop-blur-sm text-blue-600 rounded-lg shadow-lg hover:bg-white transition-all duration-200 flex items-center gap-2 font-medium">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Slide
                      </button>
                    </ContentModal>
                  </div>
                )}
              </div>
            ))
          }

          {/* Dark Overlay */}
          <div class="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50 z-[1]" />

          {/* Content */}
          <div class="container mx-auto px-6 relative z-10">
            <div class="text-center text-white">
              <div class="relative inline-block group mb-6">
                <h1 class="text-5xl md:text-7xl font-bold mb-6">
                  Overlay Button Demo
                </h1>
                {/* <button class="absolute top-0 right-0 bg-white text-purple-600 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-300">
                ✏️ Edit
              </button> */}
              </div>

              <div class="relative inline-block group">
                <p class="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
                  Qwik + Tailwind: Multi-level menu, maps, modal & slideshow dengan 130+ overlay buttons
                </p>
                {/* <button class="absolute top-0 right-0 bg-white text-purple-600 px-3 py-1.5 rounded-lg shadow-lg text-xs font-semibold hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-300">
                📋 Copy
              </button> */}
              </div>

              <div class="flex justify-center gap-4 mt-8 flex-wrap">
                <div class="relative inline-block group">
                  <a
                    href="#breakingnews"
                    onClick$={(e) => {
                      e.preventDefault();
                      const element = document.getElementById('breakingnews');
                      if (element) {
                        const navbarHeight = 80; // Offset to prevent overshooting
                        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                        const offsetPosition = elementPosition - navbarHeight;

                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    class="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition duration-300 shadow-lg inline-block"
                  >
                    Get Started
                  </a>
                  {/* <button class="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full shadow-lg text-xs font-semibold hover:bg-green-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  ⚙️
                </button> */}
                </div>
                {/* <div class="relative inline-block group">
                <a href="#gallery" class="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition duration-300 inline-block">
                  Learn More
                </a>
                <button class="absolute -top-2 -right-2 bg-blue-500 text-white px-2 py-1 rounded-full shadow-lg text-xs font-semibold hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  📚
                </button>
              </div> */}
              </div>
            </div>
          </div>

          {/* Slideshow Controls */}
          {/* Prev Button - Left Bottom */}
          <div class="absolute bottom-8 left-8 z-20">
            <button onClick$={heroPrevSlide} class="bg-white/20 backdrop-blur-lg border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition cursor-pointer">
              ❮
            </button>
          </div>

          {/* Dot Indicators - Center Bottom */}
          <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
            <div class="flex gap-2">
              {heroSlides.map((_, idx) => (
                <div
                  key={idx}
                  onClick$={() => heroGoToSlide(idx)}
                  class={`h-3 rounded-full cursor-pointer transition-all duration-300 ${heroCurrentSlide.value === idx
                    ? 'w-8 bg-white'
                    : 'w-3 bg-white/50'
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Pause and Next Buttons - Right Bottom */}
          <div class="absolute bottom-8 right-8 z-20 flex gap-4">
            <button onClick$={heroTogglePlayPause} class="bg-white/20 backdrop-blur-lg border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition cursor-pointer">
              {heroIsPlaying.value ? '⏸' : '▶'}
            </button>

            <button onClick$={heroNextSlide} class="bg-white/20 backdrop-blur-lg border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition cursor-pointer">
              ❯
            </button>
          </div>

        </section >
      )}
    </>
  );
});