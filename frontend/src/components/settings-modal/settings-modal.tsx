import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { siteMetadataApi, userProfileApi, type UserProfile, type SiteMetadata, type UserProfileUpdateData } from "~/services/api";

interface SettingsModalProps {
    isOpen: boolean;
    onClose$: () => void;
    onSave$: (settings: Record<string, string>) => Promise<void>;
    currentSettings?: Record<string, string>;
}

export const SettingsModal = component$<SettingsModalProps>(
    ({ isOpen, onClose$, onSave$, currentSettings = {} }) => {
        // Tab state
        const activeTab = useSignal<'user' | 'site' | 'profile'>('user');

        // User Settings state (existing functionality)
        const showHero = useSignal(currentSettings.show_hero === "true");
        const showExternalContent = useSignal(currentSettings.show_external_content === "true");
        const breakingNewsAnimation = useSignal(currentSettings.breaking_news_animation || "default");
        const heroTextAlignment = useSignal(currentSettings.hero_text_alignment || "center");
        const heroButtonLabel = useSignal(currentSettings.hero_button_label || "Get Started");
        const customFaviconUrl = useSignal(currentSettings.custom_favicon_url || "");
        const avatarPhotoId = useSignal(currentSettings.avatar_photo_id || "");

        // Site Metadata state
        const siteMetadata = useSignal<SiteMetadata | null>(null);
        const siteTitle = useSignal("");
        const siteTagline = useSignal("");
        const metaDescription = useSignal("");
        const metaKeywords = useSignal("");

        // User Profile state
        const userProfile = useSignal<UserProfile | null>(null);
        const username = useSignal("");
        const email = useSignal("");
        const firstName = useSignal("");
        const lastName = useSignal("");

        const isSaving = useSignal(false);
        const isLoading = useSignal(false);
        const errorMessage = useSignal("");
        const successMessage = useSignal("");

        // Load data when modal opens
        useVisibleTask$(async ({ track }) => {
            track(() => isOpen);

            if (isOpen) {
                isLoading.value = true;
                errorMessage.value = "";

                try {
                    // Load Site Metadata
                    const metadata = await siteMetadataApi.getSiteMetadata();
                    if (metadata && metadata.length > 0) {
                        siteMetadata.value = metadata[0];
                        siteTitle.value = metadata[0].site_title || "";
                        siteTagline.value = metadata[0].site_tagline || "";
                        metaDescription.value = metadata[0].meta_description || "";
                        metaKeywords.value = metadata[0].meta_keywords || "";
                    }
                } catch (error) {
                    console.error("Error loading site metadata:", error);
                }

                try {
                    // Load User Profile
                    const profile = await userProfileApi.getCurrentProfile();
                    if (profile) {
                        userProfile.value = profile;
                        username.value = profile.user.username || "";
                        email.value = profile.user.email || "";
                        firstName.value = profile.user.first_name || "";
                        lastName.value = profile.user.last_name || "";
                    }
                } catch (error) {
                    console.error("Error loading user profile:", error);
                }

                isLoading.value = false;
            } else {
                // Reset form when modal closes
                activeTab.value = 'user';
                errorMessage.value = "";
                successMessage.value = "";
            }
        });

        // Handle User Settings save
        const handleUserSettingsSave = $(async () => {
            isSaving.value = true;
            errorMessage.value = "";
            successMessage.value = "";

            try {
                const settings = {
                    show_hero: showHero.value ? "true" : "false",
                    show_external_content: showExternalContent.value ? "true" : "false",
                    breaking_news_animation: breakingNewsAnimation.value,
                    hero_text_alignment: heroTextAlignment.value,
                    hero_button_label: heroButtonLabel.value,
                    custom_favicon_url: customFaviconUrl.value,
                    avatar_photo_id: avatarPhotoId.value,
                };

                await onSave$(settings);
                successMessage.value = "User settings saved successfully!";

                setTimeout(() => {
                    onClose$();
                }, 1000);
            } catch (error) {
                console.error("Error saving user settings:", error);
                errorMessage.value = "Failed to save user settings. Please try again.";
            } finally {
                isSaving.value = false;
            }
        });

        // Handle Site Metadata save
        const handleSiteMetadataSave = $(async () => {
            isSaving.value = true;
            errorMessage.value = "";
            successMessage.value = "";

            try {
                if (!siteMetadata.value) {
                    errorMessage.value = "Site metadata not loaded";
                    return;
                }

                const updatedData = {
                    site_title: siteTitle.value,
                    site_tagline: siteTagline.value,
                    meta_description: metaDescription.value,
                    meta_keywords: metaKeywords.value,
                };

                await siteMetadataApi.updateMetadata(siteMetadata.value.id, updatedData);
                successMessage.value = "Site metadata saved successfully!";

                setTimeout(() => {
                    onClose$();
                }, 1000);
            } catch (error) {
                console.error("Error saving site metadata:", error);
                errorMessage.value = "Failed to save site metadata. Please try again.";
            } finally {
                isSaving.value = false;
            }
        });

        // Handle User Profile save
        const handleUserProfileSave = $(async () => {
            isSaving.value = true;
            errorMessage.value = "";
            successMessage.value = "";

            try {
                const updateData: UserProfileUpdateData = {
                    username: username.value,
                    email: email.value,
                    first_name: firstName.value,
                    last_name: lastName.value,
                };

                await userProfileApi.updateCurrentProfile(updateData);
                successMessage.value = "Profile updated successfully!";

                setTimeout(() => {
                    onClose$();
                }, 1000);
            } catch (error) {
                console.error("Error updating profile:", error);
                errorMessage.value = "Failed to update profile. Please try again.";
            } finally {
                isSaving.value = false;
            }
        });

        // Main save handler that delegates based on active tab
        const handleSave = $(async () => {
            switch (activeTab.value) {
                case 'user':
                    await handleUserSettingsSave();
                    break;
                case 'site':
                    await handleSiteMetadataSave();
                    break;
                case 'profile':
                    await handleUserProfileSave();
                    break;
            }
        });

        if (!isOpen) return null;

        return (
            <div
                class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick$={onClose$}
            >
                <div
                    class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col m-4"
                    onClick$={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div class="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                        <h2 class="text-2xl font-bold">⚙️ Application Settings</h2>
                        <button
                            onClick$={onClose$}
                            class="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                            title="Close"
                        >
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div class="border-b border-gray-100 bg-gray-50">
                        <div class="flex px-6">
                            <button
                                onClick$={() => activeTab.value = 'user'}
                                class={`px-6 py-3 font-medium transition-colors border-b-2 cursor-pointer ${activeTab.value === 'user'
                                    ? 'border-purple-600 text-purple-600 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-purple-600 hover:border-gray-300'
                                    }`}
                            >
                                👤 User Settings
                            </button>
                            <button
                                onClick$={() => activeTab.value = 'site'}
                                class={`px-6 py-3 font-medium transition-colors border-b-2 cursor-pointer ${activeTab.value === 'site'
                                    ? 'border-purple-600 text-purple-600 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-purple-600 hover:border-gray-300'
                                    }`}
                            >
                                📊 Site Metadata
                            </button>
                            <button
                                onClick$={() => activeTab.value = 'profile'}
                                class={`px-6 py-3 font-medium transition-colors border-b-2 cursor-pointer ${activeTab.value === 'profile'
                                    ? 'border-purple-600 text-purple-600 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-purple-600 hover:border-gray-300'
                                    }`}
                            >
                                🔒 Profile
                            </button>
                        </div>
                    </div>

                    {/* Content - Scrollable Body */}
                    <div class="p-6 space-y-6 overflow-y-auto flex-1">
                        {/* Success Message */}
                        {successMessage.value && (
                            <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                </svg>
                                <span>{successMessage.value}</span>
                            </div>
                        )}

                        {/* Error Message */}
                        {errorMessage.value && (
                            <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                                <span>{errorMessage.value}</span>
                            </div>
                        )}

                        {/* Loading Indicator */}
                        {isLoading.value && (
                            <div class="flex items-center justify-center py-12">
                                <div class="flex flex-col items-center gap-3">
                                    <svg class="animate-spin h-10 w-10 text-purple-600" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <p class="text-gray-600 font-medium">Loading settings...</p>
                                </div>
                            </div>
                        )}

                        {/* Tab Content - Only show when not loading */}
                        {!isLoading.value && (
                            <>
                                {/* Tab 1: User Settings */}
                                {activeTab.value === 'user' && (
                                    <div class="space-y-6">
                                        {/* Profile Settings */}
                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Profile</h3>

                                            {/* Change Avatar */}
                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>👤</span>
                                                        <span>Change Avatar</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={avatarPhotoId.value}
                                                        onInput$={(e) => (avatarPhotoId.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="Enter Photo ID for avatar"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                    <p class="text-xs text-gray-500 mt-1">Enter the Photo ID to use as your avatar (upload photo first)</p>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Hero Section Settings */}
                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Hero Section</h3>

                                            {/* Show Hero Toggle */}
                                            <label class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                                <div class="flex items-center gap-3">
                                                    <span class="text-2xl">🏠</span>
                                                    <div>
                                                        <p class="font-medium text-gray-800">Show Hero Section</p>
                                                        <p class="text-sm text-gray-500">Display the hero banner on the homepage</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={showHero.value}
                                                    onChange$={(e) => (showHero.value = (e.target as HTMLInputElement).checked)}
                                                    class="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                                />
                                            </label>

                                            {/* Hero Text Alignment */}
                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block mb-2">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>📐</span>
                                                        <span>Hero Text Alignment</span>
                                                    </span>
                                                    <select
                                                        value={heroTextAlignment.value}
                                                        onChange$={(e) => (heroTextAlignment.value = (e.target as HTMLSelectElement).value)}
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                                                    >
                                                        <option value="center">Center</option>
                                                        <option value="left">Left</option>
                                                    </select>
                                                </label>
                                            </div>

                                            {/* Hero Button Label */}
                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>🔘</span>
                                                        <span>Hero Button Label</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={heroButtonLabel.value}
                                                        onInput$={(e) => (heroButtonLabel.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="Get Started"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Content Settings */}
                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Content Display</h3>

                                            {/* Show External Content */}
                                            <label class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                                <div class="flex items-center gap-3">
                                                    <span class="text-2xl">🌐</span>
                                                    <div>
                                                        <p class="font-medium text-gray-800">Show External Content</p>
                                                        <p class="text-sm text-gray-500">Display content from other sites</p>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={showExternalContent.value}
                                                    onChange$={(e) => (showExternalContent.value = (e.target as HTMLInputElement).checked)}
                                                    class="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                                />
                                            </label>
                                        </div>

                                        {/* Animation Settings */}
                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Animations</h3>

                                            {/* Breaking News Animation */}
                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>⚡</span>
                                                        <span>Breaking News Animation</span>
                                                    </span>
                                                    <select
                                                        value={breakingNewsAnimation.value}
                                                        onChange$={(e) => (breakingNewsAnimation.value = (e.target as HTMLSelectElement).value)}
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                                                    >
                                                        <option value="default">Default Animation</option>
                                                        <option value="typing">Typing Animation</option>
                                                    </select>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Branding Settings */}
                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Branding</h3>

                                            {/* Custom Favicon URL */}
                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>🎨</span>
                                                        <span>Custom Favicon URL</span>
                                                    </span>
                                                    <input
                                                        type="url"
                                                        value={customFaviconUrl.value}
                                                        onInput$={(e) => (customFaviconUrl.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="https://example.com/favicon.ico"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                    <p class="text-xs text-gray-500 mt-1">Leave empty to use default favicon</p>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 2: Site Metadata */}
                                {activeTab.value === 'site' && (
                                    <div class="space-y-6">
                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Basic Information</h3>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>📄</span>
                                                        <span>Site Title</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={siteTitle.value}
                                                        onInput$={(e) => (siteTitle.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="My Awesome Website"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                </label>
                                            </div>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>✨</span>
                                                        <span>Site Tagline</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={siteTagline.value}
                                                        onInput$={(e) => (siteTagline.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="Your site's tagline"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">SEO</h3>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>📝</span>
                                                        <span>Meta Description</span>
                                                    </span>
                                                    <textarea
                                                        value={metaDescription.value}
                                                        onInput$={(e) => (metaDescription.value = (e.target as HTMLTextAreaElement).value)}
                                                        placeholder="A brief description of your site (150-160 characters)"
                                                        rows={3}
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                    <p class="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
                                                </label>
                                            </div>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>🏷️</span>
                                                        <span>Meta Keywords</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={metaKeywords.value}
                                                        onInput$={(e) => (metaKeywords.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="keyword1, keyword2, keyword3"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                    <p class="text-xs text-gray-500 mt-1">Comma-separated keywords</p>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 3: User Profile */}
                                {activeTab.value === 'profile' && (
                                    <div class="space-y-6">
                                        <div class="space-y-4">
                                            <h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Account Information</h3>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>👤</span>
                                                        <span>Username</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={username.value}
                                                        onInput$={(e) => (username.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="Username"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                </label>
                                            </div>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>✉️</span>
                                                        <span>Email</span>
                                                    </span>
                                                    <input
                                                        type="email"
                                                        value={email.value}
                                                        onInput$={(e) => (email.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="email@example.com"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                </label>
                                            </div>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>🔤</span>
                                                        <span>First Name</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={firstName.value}
                                                        onInput$={(e) => (firstName.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="First Name"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                </label>
                                            </div>

                                            <div class="p-4 bg-gray-50 rounded-lg">
                                                <label class="block">
                                                    <span class="flex items-center gap-2 font-medium text-gray-800 mb-2">
                                                        <span>🔤</span>
                                                        <span>Last Name</span>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={lastName.value}
                                                        onInput$={(e) => (lastName.value = (e.target as HTMLInputElement).value)}
                                                        placeholder="Last Name"
                                                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div class="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3 border-t border-gray-200">
                        <button
                            onClick$={onClose$}
                            disabled={isSaving.value}
                            class="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick$={handleSave}
                            disabled={isSaving.value}
                            class="px-6 py-2 text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                        >
                            {isSaving.value ? (
                                <>
                                    <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Save Settings</span>
                                </>
                            )}
                        </button>
                    </div>
                </div >
            </div >
        );
    }
);
