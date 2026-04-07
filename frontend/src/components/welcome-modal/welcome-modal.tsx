import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { AuthUser } from '~/services/api';

interface WelcomeModalProps {
    user: AuthUser | null;
    isOpen: boolean;
    onClose$: () => void;
}

export const WelcomeModal = component$<WelcomeModalProps>(({ user, isOpen, onClose$ }) => {
    const showContent = useSignal(false);

    // Animate modal on open
    useVisibleTask$(({ track }) => {
        track(() => isOpen);

        if (isOpen) {
            setTimeout(() => {
                showContent.value = true;
            }, 50);
        } else {
            showContent.value = false;
        }
    });

    // Auto-close after 5 seconds
    useVisibleTask$(({ track, cleanup }) => {
        track(() => isOpen);

        if (isOpen) {
            const timeout = setTimeout(() => {
                onClose$();
            }, 5000);

            cleanup(() => clearTimeout(timeout));
        }
    });

    const handleClose = $(() => {
        onClose$();
    });

    if (!isOpen || !user) return null;

    return (
        <div class="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div
                onClick$={handleClose}
                class={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${showContent.value ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            {/* Modal */}
            <div class="flex items-center justify-center min-h-screen p-4">
                <div
                    class={`relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 transform ${showContent.value ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                >
                    {/* Close Button */}
                    <button
                        onClick$={handleClose}
                        class="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10 cursor-pointer"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Content */}
                    <div class="p-8 text-center text-white">
                        {/* Welcome Icon */}
                        <div class="mb-6 animate-bounce">
                            <div class="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full">
                                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                            </div>
                        </div>

                        {/* Welcome Message */}
                        <h2 class="text-3xl font-bold mb-3">
                            Welcome Back!
                        </h2>
                        <p class="text-xl mb-2 font-semibold">
                            {user.username}
                        </p>
                        <p class="text-white/80 text-sm mb-6">
                            {user.email}
                        </p>

                        {/* Success Badge */}
                        <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/20">
                            <svg class="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            <span class="text-sm font-medium cursor-pointer">Login Successful</span>
                        </div>

                        {/* CTA Message */}
                        <p class="mt-6 text-white/70 text-sm">
                            You now have access to all features!
                        </p>
                    </div>

                    {/* Decorative Elements */}
                    <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                    <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                </div>
            </div>
        </div>
    );
});
