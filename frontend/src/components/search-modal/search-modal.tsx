import { component$, $, useSignal, useVisibleTask$, type QRL } from "@builder.io/qwik";

interface SearchModalProps {
    isOpen: boolean;
    onClose$: QRL<() => void>;
}

export const SearchModal = component$<SearchModalProps>(({ isOpen, onClose$ }) => {
    const searchKeyword = useSignal("");
    const inputRef = useSignal<HTMLInputElement>();

    // Auto-focus input when modal opens
    useVisibleTask$(({ track }) => {
        track(() => isOpen);
        if (isOpen && inputRef.value) {
            inputRef.value.focus();
        }
    });

    const handleSearch = $(() => {
        if (searchKeyword.value.trim()) {
            // TODO: Implement search functionality
            // For now, just log the search keyword
            console.log("Searching for:", searchKeyword.value);

            // You can redirect to a search results page or filter content
            // window.location.href = `/search?q=${encodeURIComponent(searchKeyword.value)}`;

            // Close modal after search
            onClose$();
            searchKeyword.value = "";
        }
    });

    const handleKeyPress = $((event: KeyboardEvent) => {
        if (event.key === "Enter") {
            handleSearch();
        } else if (event.key === "Escape") {
            onClose$();
        }
    });

    if (!isOpen) return null;

    return (
        <div
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick$={onClose$}
        >
            <div
                class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all"
                onClick$={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 class="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span class="text-2xl">🔍</span>
                        Search
                    </h2>
                    <button
                        onClick$={onClose$}
                        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                        aria-label="Close search"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Search Input */}
                <div class="p-6">
                    <div class="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Enter search keyword..."
                            bind:value={searchKeyword}
                            onKeyDown$={handleKeyPress}
                            class="w-full px-4 py-3 pl-12 text-lg border-2 border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                        />
                        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>

                    {/* Search Button */}
                    <div class="mt-4 flex justify-end gap-3">
                        <button
                            onClick$={onClose$}
                            class="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick$={handleSearch}
                            class="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl cursor-pointer"
                        >
                            Search
                        </button>
                    </div>

                    {/* Search Tips */}
                    <div class="mt-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            <strong class="text-gray-800 dark:text-gray-200">💡 Tips:</strong> Press <kbd class="px-2 py-1 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-xs">Enter</kbd> to search or <kbd class="px-2 py-1 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-xs">Esc</kbd> to close
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});
