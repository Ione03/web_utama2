// src/components/authModal.tsx
import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { authApi, type AuthUser, type CaptchaData, getApiBaseOrigin } from '~/services/api';
import { OTPInput } from './otpInput';

interface AuthModalProps {
    onLoginSuccess$?: (user: AuthUser) => void;
    onOpenModal$?: (openModal: (mode?: AuthMode) => void) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-password';
type AuthStep = 'form' | 'otp' | 'reset-password';

export const AuthModal = component$<AuthModalProps>(({ onLoginSuccess$, onOpenModal$ }) => {
    // Modal state
    const isOpen = useSignal(false);
    const showContent = useSignal(false);
    const mode = useSignal<AuthMode>('login');
    const step = useSignal<AuthStep>('form');

    // Form fields
    const email = useSignal('');
    const username = useSignal('');
    const password = useSignal('');
    const passwordConfirm = useSignal('');
    const newPassword = useSignal('');
    const showPassword = useSignal(false);
    const errorMessage = useSignal('');
    const successMessage = useSignal('');
    const isLoading = useSignal(false);

    // Django captcha state
    const captchaImageUrl = useSignal('');
    const captchaHashKey = useSignal('');
    const captchaAnswer = useSignal('');

    // OTP state
    const resendCountdown = useSignal(0);
    const rememberDevice = useSignal(true);  // Remember device by default

    const openModal = $((initialMode: AuthMode = 'login') => {
        mode.value = initialMode;
        step.value = 'form';
        isOpen.value = true;
        setTimeout(() => showContent.value = true, 50);
    });

    // Load captcha from backend
    const loadCaptcha = $(async () => {
        try {
            const data: CaptchaData = await authApi.getCaptcha();
            captchaImageUrl.value = `${getApiBaseOrigin()}${data.image_url}`;
            captchaHashKey.value = data.key;
            captchaAnswer.value = '';
        } catch (error) {
            console.error('Failed to load captcha:', error);
            errorMessage.value = 'Failed to load captcha. Please try again.';
        }
    });

    const resetForm = $(async () => {
        email.value = '';
        username.value = '';
        password.value = '';
        passwordConfirm.value = '';
        newPassword.value = '';
        errorMessage.value = '';
        successMessage.value = '';
        captchaImageUrl.value = '';
        captchaHashKey.value = '';
        captchaAnswer.value = '';
        // Fetch new captcha after reset
        await loadCaptcha();
    });

    const switchMode = $((newMode: AuthMode) => {
        mode.value = newMode;
        step.value = 'form';
        resetForm();
    });

    const closeModal = $(() => {
        showContent.value = false;
        setTimeout(() => {
            isOpen.value = false;
            resetForm();
        }, 200);
    });

    // Expose openModal function to parent component
    useVisibleTask$(() => {
        if (onOpenModal$) {
            onOpenModal$(openModal);
        }
    });

    // Login handler
    const handleLogin = $(async (e: Event) => {
        e.preventDefault();
        if (!username.value || !password.value || !captchaAnswer.value) {
            errorMessage.value = 'Please fill all fields and complete captcha';
            return;
        }

        isLoading.value = true;
        errorMessage.value = '';

        try {
            const response = await authApi.login({
                username: username.value,
                password: password.value,
                captchaKey: captchaHashKey.value,
                captchaValue: captchaAnswer.value
            });

            // Check if OTP is skipped (trusted device)
            if (response.skip_otp && response.user) {
                // Login successful without OTP
                if (onLoginSuccess$) {
                    onLoginSuccess$(response.user);
                }
                closeModal();
            } else {
                // Proceed to OTP step
                step.value = 'otp';
            }
        } catch (error) {
            errorMessage.value = error instanceof Error ? error.message : 'Login failed';
            // Reload captcha on error
            await loadCaptcha();
        } finally {
            isLoading.value = false;
        }
    });

    // Registration handler
    const handleRegister = $(async (e: Event) => {
        e.preventDefault();
        if (!email.value || !password.value || !passwordConfirm.value) {
            errorMessage.value = 'Please fill all fields';
            return;
        }

        isLoading.value = true;
        errorMessage.value = '';

        try {
            const result = await authApi.register({
                email: email.value,
                password: password.value,
                password_confirm: passwordConfirm.value
            });
            successMessage.value = result.message;
            setTimeout(() => {
                switchMode('login');
                username.value = result.username;
            }, 3000);
        } catch (error) {
            errorMessage.value = error instanceof Error ? error.message : 'Registration  failed';
        } finally {
            isLoading.value = false;
        }
    });

    // Forgot password handler
    const handleForgotPassword = $(async (e: Event) => {
        e.preventDefault();
        if (!email.value) {
            errorMessage.value = 'Please enter your email';
            return;
        }

        isLoading.value = true;
        errorMessage.value = '';

        try {
            await authApi.forgotPassword(email.value);
            step.value = 'reset-password';
            successMessage.value = 'Reset code sent to your email';
        } catch (error) {
            errorMessage.value = error instanceof Error ? error.message : 'Request failed';
        } finally {
            isLoading.value = false;
        }
    });

    // Reset password handler
    const handleResetPassword = $(async (e: Event) => {
        e.preventDefault();
        const otpInputs = document.querySelectorAll<HTMLInputElement>('.otp-input');
        const otp = Array.from(otpInputs).map(input => input.value).join('');

        if (!otp || !newPassword.value || !passwordConfirm.value) {
            errorMessage.value = 'Please fill all fields';
            return;
        }

        isLoading.value = true;
        errorMessage.value = '';

        try {
            const result = await authApi.resetPassword({
                email: email.value,
                otp: otp,
                new_password: newPassword.value,
                password_confirm: passwordConfirm.value
            });
            successMessage.value = result.message;
            setTimeout(() => {
                switchMode('login');
            }, 3000);
        } catch (error) {
            errorMessage.value = error instanceof Error ? error.message : 'Reset failed';
        } finally {
            isLoading.value = false;
        }
    });

    // OTP verification handler
    const handleOTPComplete = $(async (otp: string) => {
        isLoading.value = true;
        errorMessage.value = '';

        try {
            const response = await authApi.verifyOTP({
                username: username.value,
                otp: otp,
                remember_device: rememberDevice.value
            });

            // Store trust token if provided
            if (response.trust_token) {
                localStorage.setItem('trust_token', response.trust_token);
            }

            if (onLoginSuccess$) {
                onLoginSuccess$(response.user);
            }
            closeModal();
        } catch (error) {
            errorMessage.value = error instanceof Error ? error.message : 'OTP verification failed';
        } finally {
            isLoading.value = false;
        }
    });

    // Resend OTP
    const handleResendOTP = $(async () => {
        if (resendCountdown.value > 0) return;

        try {
            await authApi.resendOTP(username.value);
            resendCountdown.value = 60;
            const interval = setInterval(() => {
                resendCountdown.value--;
                if (resendCountdown.value <= 0) clearInterval(interval);
            }, 1000);
        } catch (error) {
            errorMessage.value = error instanceof Error ? error.message : 'Failed to resend OTP';
        }
    });

    // Load captcha on modal open
    useVisibleTask$(({ track }) => {
        track(() => isOpen.value);

        if (isOpen.value && mode.value === 'login') {
            loadCaptcha();
        }
    });

    // ESC key handler
    useVisibleTask$(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen.value) closeModal();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    const getTitle = () => {
        if (step.value === 'otp') return 'Verify OTP';
        if (step.value === 'reset-password') return 'Reset Password';
        if (mode.value === 'register') return 'Create Account';
        if (mode.value === 'forgot-password') return 'Forgot Password';
        return 'Secure Login';
    };

    return (
        <>

            {isOpen.value && (
                <div class="fixed inset-0 z-[9999] overflow-y-auto">
                    <div
                        onClick$={(e) => (e.target as HTMLElement).classList.contains('modal-overlay') && closeModal()}
                        class={`fixed inset-0 bg-black/70 modal-overlay transition-opacity duration-300
                   ${showContent.value ? 'opacity-100' : 'opacity-0'}`}
                    />

                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md transition-all duration-300
                        ${showContent.value ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>

                            {/* Header */}
                            <div class="flex justify-between items-center p-6 border-b">
                                <h3 class="text-2xl font-bold text-gray-800">{getTitle()}</h3>
                                <button onClick$={closeModal} class="text-gray-500 hover:text-gray-700">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Body */}
                            <div class="p-6">
                                {/* Success Message */}
                                {successMessage.value && (
                                    <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                        {successMessage.value}
                                    </div>
                                )}

                                {/* Error Message */}
                                {errorMessage.value && (
                                    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                        {errorMessage.value}
                                    </div>
                                )}

                                {/* Login Form */}
                                {mode.value === 'login' && step.value === 'form' && (
                                    <form preventdefault:submit onSubmit$={handleLogin} class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                            <input
                                                type="text"
                                                value={username.value}
                                                onInput$={(e) => username.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                            <input
                                                type={showPassword.value ? 'text' : 'password'}
                                                value={password.value}
                                                onInput$={(e) => password.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Captcha</label>
                                            <div class="flex items-center gap-2">
                                                {captchaImageUrl.value && (
                                                    <img
                                                        src={captchaImageUrl.value}
                                                        alt="Captcha"
                                                        class="border rounded"
                                                        style="height: 50px;"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick$={loadCaptcha}
                                                    class="px-3 py-2 border rounded-lg hover:bg-gray-100"
                                                    title="Refresh captcha"
                                                >
                                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={captchaAnswer.value}
                                                onInput$={(e) => captchaAnswer.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 mt-2"
                                                placeholder="Enter captcha text"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading.value}
                                            class="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg
                             hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isLoading.value ? 'Processing...' : 'Continue'}
                                        </button>
                                        <div class="text-center space-y-2">
                                            <button
                                                type="button"
                                                onClick$={() => switchMode('forgot-password')}
                                                class="text-sm text-indigo-600 hover:text-indigo-700"
                                            >
                                                Forgot password?
                                            </button>
                                            <div class="text-sm text-gray-600">
                                                Don't have an account?{' '}
                                                <button
                                                    type="button"
                                                    onClick$={() => switchMode('register')}
                                                    class="text-indigo-600 hover:text-indigo-700 font-medium"
                                                >
                                                    Sign up
                                                </button>
                                            </div>
                                        </div>

                                        {/* Social Login */}
                                        <div class="relative my-6">
                                            <div class="absolute inset-0 flex items-center">
                                                <div class="w-full border-t border-gray-300"></div>
                                            </div>
                                            <div class="relative flex justify-center text-sm">
                                                <span class="px-2 bg-white text-gray-500">Or continue with</span>
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-3 gap-3">
                                            <button type="button" class="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50">
                                                <svg class="w-5 h-5" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            </button>
                                            <button type="button" class="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50">
                                                <svg class="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                            </button>
                                            <button type="button" class="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50">
                                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Register Form */}
                                {mode.value === 'register' && (
                                    <form preventdefault:submit onSubmit$={handleRegister} class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={email.value}
                                                onInput$={(e) => email.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                            <input
                                                type="password"
                                                value={password.value}
                                                onInput$={(e) => password.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="At least 8 characters"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                            <input
                                                type="password"
                                                value={passwordConfirm.value}
                                                onInput$={(e) => passwordConfirm.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading.value}
                                            class="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg
                             hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isLoading.value ? 'Creating Account...' : 'Sign Up'}
                                        </button>
                                        <div class="text-center text-sm text-gray-600">
                                            Already have an account?{' '}
                                            <button
                                                type="button"
                                                onClick$={() => switchMode('login')}
                                                class="text-indigo-600 hover:text-indigo-700 font-medium"
                                            >
                                                Login
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Forgot Password Form */}
                                {mode.value === 'forgot-password' && step.value === 'form' && (
                                    <form preventdefault:submit onSubmit$={handleForgotPassword} class="space-y-4">
                                        <p class="text-sm text-gray-600 mb-4">
                                            Enter your email and we'll send you a code to reset your password.
                                        </p>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={email.value}
                                                onInput$={(e) => email.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading.value}
                                            class="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg
                             hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isLoading.value ? 'Sending Code...' : 'Send Reset Code'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick$={() => switchMode('login')}
                                            class="w-full py-2 text-gray-600 hover:text-gray-800"
                                        >
                                            Back to Login
                                        </button>
                                    </form>
                                )}

                                {/* Reset Password Form */}
                                {step.value === 'reset-password' && (
                                    <form preventdefault:submit onSubmit$={handleResetPassword} class="space-y-4">
                                        <p class="text-sm text-gray-600 mb-4">
                                            Enter the 6-digit code sent to your email and your new password.
                                        </p>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Reset Code</label>
                                            <OTPInput length={6} onComplete$={() => { }} isDisabled={isLoading.value} />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword.value}
                                                onInput$={(e) => newPassword.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="At least 8 characters"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={passwordConfirm.value}
                                                onInput$={(e) => passwordConfirm.value = (e.target as HTMLInputElement).value}
                                                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading.value}
                                            class="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg
                             hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isLoading.value ? 'Resetting Password...' : 'Reset Password'}
                                        </button>
                                    </form>
                                )}

                                {/* OTP Verification */}
                                {step.value === 'otp' && (
                                    <div class="space-y-6">
                                        <div class="text-center">
                                            <p class="text-gray-600 mb-2">We've sent a 6-digit code to your email</p>
                                            <p class="text-sm text-gray-500">Please enter it below to complete login</p>
                                        </div>
                                        <OTPInput length={6} onComplete$={handleOTPComplete} isDisabled={isLoading.value} />
                                        <div class="mt-4">
                                            <label class="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={rememberDevice.value}
                                                    onChange$={(e) => rememberDevice.value = (e.target as HTMLInputElement).checked}
                                                    class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span class="text-sm text-gray-600">
                                                    Ingat perangkat ini selama 7 hari (tidak perlu OTP)
                                                </span>
                                            </label>
                                        </div>
                                        <div class="text-center">
                                            {resendCountdown.value > 0 ? (
                                                <p class="text-sm text-gray-500">Resend code in {resendCountdown.value}s</p>
                                            ) : (
                                                <button
                                                    onClick$={handleResendOTP}
                                                    class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                                >
                                                    Resend OTP
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick$={() => step.value = 'form'}
                                            class="w-full py-2 border rounded-lg hover:bg-gray-50"
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
