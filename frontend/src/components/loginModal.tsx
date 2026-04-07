// src/components/loginModal.tsx
import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { authApi, type AuthUser } from '~/services/api';
import { OTPInput } from './otpInput';

interface LoginModalProps {
    onLoginSuccess$?: (user: AuthUser) => void;
}

export const LoginModal = component$<LoginModalProps>(({ onLoginSuccess$ }) => {
    // Modal state
    const isOpen = useSignal(false);
    const showContent = useSignal(false);

    // Form states
    const step = useSignal<'login' | 'otp'>('login');
    const username = useSignal('');
    const password = useSignal('');
    const showPassword = useSignal(false);
    const otpCode = useSignal('');
    const errorMessage = useSignal('');
    const isLoading = useSignal(false);

    // hCaptcha state
    const captchaToken = useSignal('');
    const captchaKey = useSignal(Date.now()); // For resetting captcha

    // Resend OTP state
    const resentendCountdown = useSignal(0);

    // Open modal
    const openModal = $(() => {
        isOpen.value = true;
        setTimeout(() => {
            showContent.value = true;
        }, 50);
    });

    // Close modal
    const closeModal = $(() => {
        showContent.value = false;
        setTimeout(() => {
            isOpen.value = false;
            // Reset form
            step.value = 'login';
            username.value = '';
            password.value = '';
            showPassword.value = false;
            otpCode.value = '';
            errorMessage.value = '';
            captchaToken.value = '';
            captchaKey.value = Date.now();
        }, 200);
    });

    // Handle outside click
    const handleOutsideClick = $((event: MouseEvent) => {
        if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    // Handle login submission
    const handleLogin = $(async (e: Event) => {
        e.preventDefault();

        if (!username.value || !password.value) {
            errorMessage.value = 'Please enter username and password';
            return;
        }

        if (!captchaToken.value) {
            errorMessage.value = 'Please complete the captcha';
            return;
        }

        isLoading.value = true;
        errorMessage.value = '';

        try {
            await authApi.login({
                username: username.value,
                password: password.value,
                captchaToken: captchaToken.value
            });

            // Move to OTP step
            step.value = 'otp';
            isLoading.value = false;
        } catch (error) {
            isLoading.value = false;
            errorMessage.value = error instanceof Error ? error.message : 'Login failed';
            // Reset captcha
            captchaKey.value = Date.now();
            captchaToken.value = '';
        }
    });

    // Handle OTP completion
    const handleOTPComplete = $(async (otp: string) => {
        isLoading.value = true;
        errorMessage.value = '';

        try {
            const response = await authApi.verifyOTP({
                username: username.value,
                otp: otp
            });

            // Login successful
            if (onLoginSuccess$) {
                onLoginSuccess$(response.user);
            }

            closeModal();
        } catch (error) {
            isLoading.value = false;
            errorMessage.value = error instanceof Error ? error.message : 'OTP verification failed';
            otpCode.value = ''; // Reset OTP input
        }
    });

    // Handle resend OTP
    const handleResendOTP = $(async () => {
        if (resendCountdown.value > 0) return;

        isLoading.value = true;
        errorMessage.value = '';

        try {
            await authApi.resendOTP(username.value);

            // Start countdown (60 seconds)
            resendCountdown.value = 60;
            const interval = setInterval(() => {
                resendCountdown.value--;
                if (resendCountdown.value <= 0) {
                    clearInterval(interval);
                }
            }, 1000);

            errorMessage.value = '';
            isLoading.value = false;
        } catch (error) {
            isLoading.value = false;
            errorMessage.value = error instanceof Error ? error.message : 'Failed to resend OTP';
        }
    });

    // Load hCaptcha callback
    useVisibleTask$(({ track }) => {
        track(() => isOpen.value);
        track(() => captchaKey.value);

        if (isOpen.value && typeof window !== 'undefined') {
            // Wait for hCaptcha to load
            const checkHcaptcha = setInterval(() => {
                if ((window as any).hcaptcha) {
                    clearInterval(checkHcaptcha);

                    // Render hCaptcha
                    setTimeout(() => {
                        try {
                            const container = document.getElementById('hcaptcha-container');
                            if (container && container.children.length === 0) {
                                (window as any).hcaptcha.render('hcaptcha-container', {
                                    sitekey: 'YOUR_HCAPTCHA_SITE_KEY_HERE', // This should come from environment
                                    callback: (token: string) => {
                                        captchaToken.value = token;
                                    },
                                    'expired-callback': () => {
                                        captchaToken.value = '';
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('hCaptcha render error:', e);
                        }
                    }, 100);
                }
            }, 100);

            // Cleanup
            return () => clearInterval(checkHcaptcha);
        }
    });

    // ESC key handler
    useVisibleTask$(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen.value) {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    return (
        <>
            {/* Login Button */}
            <button
                onClick$={openModal}
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium
               hover:bg-indigo-700 transition-colors duration-200
               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                Login
            </button>

            {/* Modal */}
            {isOpen.value && (
                <div class="fixed inset-0 z-[9999] overflow-y-auto">
                    {/* Overlay */}
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
                        <div
                            class={`
                relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto
                transition-all duration-300 ease-out
                ${showContent.value ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
              `}
                        >
                            {/* Header */}
                            <div class="flex justify-between items-center p-6 border-b border-gray-100">
                                <h3 class="text-2xl font-bold text-gray-800">
                                    {step.value === 'login' ? 'Secure Login' : 'Verify OTP'}
                                </h3>
                                <button
                                    onClick$={closeModal}
                                    class="text-gray-500 hover:text-gray-700 transition duration-200 cursor-pointer"
                                >
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Body */}
                            <div class="p-6">
                                {step.value === 'login' ? (
                                    /* Login Form */
                                    <form preventdefault:submit onSubmit$={handleLogin}>
                                        <div class="space-y-4">
                                            {/* Username */}
                                            <div>
                                                <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
                                                    Username
                                                </label>
                                                <input
                                                    id="username"
                                                    type="text"
                                                    value={username.value}
                                                    onInput$={(e) => username.value = (e.target as HTMLInputElement).value}
                                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                 transition duration-200"
                                                    placeholder="Enter your username"
                                                    required
                                                    autoComplete="username"
                                                />
                                            </div>

                                            {/* Password */}
                                            <div>
                                                <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                                                    Password
                                                </label>
                                                <div class="relative">
                                                    <input
                                                        id="password"
                                                        type={showPassword.value ? 'text' : 'password'}
                                                        value={password.value}
                                                        onInput$={(e) => password.value = (e.target as HTMLInputElement).value}
                                                        class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                   transition duration-200"
                                                        placeholder="Enter your password"
                                                        required
                                                        autoComplete="current-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick$={() => showPassword.value = !showPassword.value}
                                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    >
                                                        {showPassword.value ? (
                                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                            </svg>
                                                        ) : (
                                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* hCaptcha */}
                                            <div class="flex justify-center py-2">
                                                <div id="hcaptcha-container" key={captchaKey.value}></div>
                                            </div>

                                            {/* Error Message */}
                                            {errorMessage.value && (
                                                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                                    {errorMessage.value}
                                                </div>
                                            )}

                                            {/* Submit Button */}
                                            <button
                                                type="submit"
                                                disabled={isLoading.value}
                                                class="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg
                               hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition duration-200 cursor-pointer"
                                            >
                                                {isLoading.value ? 'Processing...' : 'Continue'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    /* OTP Verification Form */
                                    <div class="space-y-6">
                                        <div class="text-center">
                                            <p class="text-gray-600 mb-2">
                                                We've sent a 6-digit code to your email
                                            </p>
                                            <p class="text-sm text-gray-500">
                                                Please enter it below to complete login
                                            </p>
                                        </div>

                                        {/* OTP Input */}
                                        <OTPInput
                                            length={6}
                                            onComplete$={handleOTPComplete}
                                            isDisabled={isLoading.value}
                                        />

                                        {/* Error Message */}
                                        {errorMessage.value && (
                                            <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                                                {errorMessage.value}
                                            </div>
                                        )}

                                        {/* Resend OTP */}
                                        <div class="text-center">
                                            {resendCountdown.value > 0 ? (
                                                <p class="text-sm text-gray-500">
                                                    Resend code in {resendCountdown.value}s
                                                </p>
                                            ) : (
                                                <button
                                                    onClick$={handleResendOTP}
                                                    disabled={isLoading.value}
                                                    class="text-sm text-indigo-600 hover:text-indigo-700 font-medium
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Resend OTP
                                                </button>
                                            )}
                                        </div>

                                        {/* Back Button */}
                                        <button
                                            onClick$={() => {
                                                step.value = 'login';
                                                errorMessage.value = '';
                                                otpCode.value = '';
                                            }}
                                            class="w-full py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg
                             hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300
                             transition duration-200 cursor-pointer"
                                        >
                                            Back to Login
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});
