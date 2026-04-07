// src/hooks/useIdleTimer.tsx
import { $, useVisibleTask$, useSignal } from '@builder.io/qwik';

interface UseIdleTimerOptions {
    timeout: number; // in milliseconds
    onIdle: () => void;
}

export const useIdleTimer = (options: UseIdleTimerOptions) => {
    const { timeout, onIdle } = options;
    const isIdle = useSignal(false);

    useVisibleTask$(() => {
        if (typeof window === 'undefined') return;

        let timer: NodeJS.Timeout;

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            isIdle.value = false;

            timer = setTimeout(() => {
                isIdle.value = true;
                console.log('User idle detected, logging out...');
                onIdle();
            }, timeout);
        };

        // Events to track user activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer, true);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer, true);
            });
        };
    });

    return {
        isIdle
    };
};
