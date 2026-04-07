import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";

export const ScrollToTop = component$(() => {
    const isVisible = useSignal(false);

    // Show button when page is scrolled down
    useVisibleTask$(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                isVisible.value = true;
            } else {
                isVisible.value = false;
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    });

    const scrollToTop = $(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    return (
        <>
            {isVisible.value && (
                <button
                    onClick$={scrollToTop}
                    class="fixed bottom-8 right-8 p-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110 z-50 group cursor-pointer"
                    aria-label="Scroll to top"
                >
                    <svg
                        class="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}
        </>
    );
});
