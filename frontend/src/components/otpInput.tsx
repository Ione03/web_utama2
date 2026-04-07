// src/components/otpInput.tsx
import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';

interface OTPInputProps {
    length?: number;
    onComplete$: (otp: string) => void;
    isDisabled?: boolean;
}

export const OTPInput = component$<OTPInputProps>(({ length = 6, onComplete$, isDisabled = false }) => {
    const inputRefs = useSignal<(HTMLInputElement | null)[]>([]);
    const values = useSignal<string[]>(Array(length).fill(''));

    // Initialize refs array and auto-focus first input (runs once on mount)
    useVisibleTask$(() => {
        // Initialize refs
        inputRefs.value = Array(length).fill(null);

        // Auto-focus first input with proper timing
        const focusFirstInput = () => {
            const firstInput = inputRefs.value[0];
            if (firstInput) {
                console.log('Auto-focusing first OTP input');
                firstInput.focus();
                return true;
            }
            return false;
        };

        // Try immediate focus
        if (!focusFirstInput()) {
            // If refs not ready, retry after short delay
            const timer = setTimeout(focusFirstInput, 150);
            return () => clearTimeout(timer);
        }
    });

    const handleChange = $((index: number, value: string) => {
        if (isDisabled) return;

        // Only allow digits
        const digit = value.replace(/\D/g, '');

        if (digit.length > 1) {
            // Handle paste with multiple digits
            handlePaste(digit);
            return;
        }

        // Update current value
        const newValues = [...values.value];
        newValues[index] = digit;
        values.value = newValues;

        // Auto-advance to next input
        if (digit && index < length - 1) {
            const nextInput = inputRefs.value[index + 1];
            if (nextInput) {
                nextInput.focus();
            }
        }

        // Check if all inputs are filled
        const otp = newValues.join('');
        console.log('OTP values:', newValues, 'OTP string:', otp, 'Length:', otp.length);
        if (otp.length === length && newValues.every(v => v !== '')) {
            console.log('OTP Complete! Calling onComplete$ with:', otp);
            onComplete$(otp);
        }
    });

    const handleKeyDown = $((index: number, event: KeyboardEvent) => {
        if (isDisabled) return;

        // Handle backspace
        if (event.key === 'Backspace' && !values.value[index] && index > 0) {
            const prevInput = inputRefs.value[index - 1];
            if (prevInput) {
                prevInput.focus();
            }
        }

        // Handle arrow keys
        if (event.key === 'ArrowLeft' && index > 0) {
            const prevInput = inputRefs.value[index - 1];
            if (prevInput) {
                prevInput.focus();
            }
        }

        if (event.key === 'ArrowRight' && index < length - 1) {
            const nextInput = inputRefs.value[index + 1];
            if (nextInput) {
                nextInput.focus();
            }
        }
    });

    const handlePaste = (pastedData: string) => {
        if (isDisabled) return;

        const digits = pastedData.replace(/\D/g, '').slice(0, length);
        const newValues = Array(length).fill('');

        for (let i = 0; i < digits.length; i++) {
            newValues[i] = digits[i];
        }

        values.value = newValues;

        // Focus on the last filled input or first empty
        const focusIndex = Math.min(digits.length, length - 1);
        const focusInput = inputRefs.value[focusIndex];
        if (focusInput) {
            focusInput.focus();
        }

        // Check if all inputs are filled
        const otp = newValues.join('');
        console.log('Paste - OTP values:', newValues, 'OTP string:', otp);
        if (otp.length === length && newValues.every(v => v !== '')) {
            console.log('Paste - OTP Complete! Calling onComplete$ with:', otp);
            onComplete$(otp);
        }
    };

    return (
        <div class="flex gap-2 justify-center">
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => (inputRefs.value[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={values.value[index]}
                    disabled={isDisabled}
                    onInput$={(e) => handleChange(index, (e.target as HTMLInputElement).value)}
                    onKeyDown$={(e) => handleKeyDown(index, e)}
                    onPaste$={(e) => {
                        e.preventDefault();
                        const pastedData = e.clipboardData?.getData('text') || '';
                        handlePaste(pastedData);
                    }}
                    class={`
            w-12 h-14 text-center text-2xl font-semibold
            border-2 rounded-lg
            transition-all duration-200
            ${isDisabled
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                            : values.value[index]
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-600'
                        }
            focus:outline-none focus:ring-2 focus:ring-indigo-200
          `}
                />
            ))}
        </div>
    );
});
