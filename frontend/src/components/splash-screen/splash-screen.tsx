import { component$, useSignal, useVisibleTask$, useStylesScoped$ } from "@builder.io/qwik";
import { contentApi } from "~/services/api";

export const SplashScreen = component$(() => {
    useStylesScoped$(`
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.05);
        opacity: 0.8;
      }
    }

    @keyframes fadeInLogo {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes spinSlow {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .splash-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: opacity 0.5s ease-out;
    }

    .splash-container.fade-out {
      animation: fadeOut 0.8s ease-out forwards;
    }

    .logo-container {
      position: relative;
      animation: fadeIn 0.8s ease-out;
    }

    .logo-image {
      width: 120px;
      height: 120px;
      object-fit: contain;
      border-radius: 0;
      animation: fadeInLogo 0.6s ease-out 1s forwards, pulse 2s ease-in-out 1.6s infinite;
      background: transparent;
      padding: 0;
      mix-blend-mode: multiply;
      filter: contrast(1.1) brightness(1.1);
      opacity: 0;
    }

    .loading-ring {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      animation: spinSlow 1.5s linear infinite;
    }

    .loading-text {
      position: absolute;
      bottom: -60px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 2px;
      white-space: nowrap;
      opacity: 0.9;
    }

    .loading-dots {
      display: inline-block;
      width: 20px;
      text-align: left;
    }

    @keyframes dotPulse {
      0%, 20% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }

    .dot {
      animation: dotPulse 1.4s infinite;
    }

    .dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
      animation-delay: 0.4s;
    }
  `);

    const isVisible = useSignal(true);
    const isLoading = useSignal(true);
    const logoUrl = useSignal<string>("");
    const code = "GHHrrNrXYRDkkWuwZyYbEoIsSdZhCHDwtzvn2jD2elHbc0RgljqE7xd"; // Same code as logo-image

    useVisibleTask$(async () => {
        try {
            // Load logo from database
            const data = await contentApi.getContentByCode(code);
            if (data && data.value_image && data.value_image.length > 0) {
                logoUrl.value = data.value_image[0].image || "";
                console.log("Splash logo loaded:", logoUrl.value);
            }
        } catch (error) {
            console.error("Error loading splash logo:", error);
        }

        // Minimum display time for splash screen (1.5 seconds)
        const minimumDisplayTime = 1500;
        const startTime = Date.now();

        // Wait for window to load
        const handleLoad = () => {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, minimumDisplayTime - elapsedTime);

            setTimeout(() => {
                isLoading.value = false;
                // Start fade out animation
                setTimeout(() => {
                    isVisible.value = false;
                }, 100);
            }, remainingTime);
        };

        if (document.readyState === "complete") {
            handleLoad();
        } else {
            window.addEventListener("load", handleLoad);
        }
    });

    // Don't render if not visible
    if (!isVisible.value) {
        return null;
    }

    return (
        <div class={`splash-container ${!isLoading.value ? "fade-out" : ""}`}>
            <div class="logo-container">
                <div class="loading-ring"></div>
                {logoUrl.value ? (
                    <img
                        src={logoUrl.value}
                        alt="Logo"
                        class="logo-image"
                    />
                ) : (
                    <div class="logo-image" style="display: flex; align-items: center; justify-content: center; font-size: 48px;">
                        <img src="media/images/default-logo.png" alt="" />
                    </div>
                )}
                <div class="loading-text">
                    LOADING
                    <span class="loading-dots">
                        <span class="dot">.</span>
                        <span class="dot">.</span>
                        <span class="dot">.</span>
                    </span>
                </div>
            </div>
        </div>
    );
});
