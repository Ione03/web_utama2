import { component$, useSignal, $, useVisibleTask$, useStore } from "@builder.io/qwik";
import { SearchModal } from "../search-modal/search-modal";
import type { AuthUser } from "~/services/api";

export interface MenuItem {
  encrypted_id: string;
  encrypted_code: string;
  value_text: string;
  slug: string;
  url: string;
  order: number;
  children: MenuItem[];
}

interface MobileMenuProps {
  currentUser?: AuthUser | null;
  onOpenLogin$?: () => void;
}

export const MobileMenu = component$<MobileMenuProps>(({ currentUser, onOpenLogin$ }) => {
  const mobileMenuOpen = useSignal(false);
  const searchModalOpen = useSignal(false);
  const menuItems = useStore<{ items: MenuItem[] }>({ items: [] });
  const isLoading = useSignal(true);

  // Fetch menu items from database
  const fetchMenuItems = $(async () => {
    try {
      isLoading.value = true;
      const response = await fetch('/api/contents/navigation/top/');
      if (response.ok) {
        menuItems.items = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch navigation menu:", error);
    } finally {
      isLoading.value = false;
    }
  });

  useVisibleTask$(async () => {
    await fetchMenuItems();
  });

  // Render menu item recursively for mobile (supports nesting)
  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const paddingClass = level === 0 ? 'pl-0' : level === 1 ? 'pl-8' : 'pl-12';

    if (hasChildren) {
      return (
        <details class="group/menu" key={item.encrypted_id}>
          <summary class={`py-2 text-gray-700 hover:text-purple-600 hover:bg-gray-50 px-4 rounded transition cursor-pointer list-none flex items-center justify-between ${paddingClass}`}>
            <span>{item.value_text}</span>
            <svg class="w-4 h-4 transition-transform group-open/menu:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </summary>
          <div class="space-y-1">
            {item.children.map((child) => renderMenuItem(child, level + 1))}
          </div>
        </details>
      );
    }

    return (
      <a
        key={item.encrypted_id}
        href={`/${item.slug}`}
        class={`block py-2 text-gray-700 hover:text-purple-600 hover:bg-gray-50 px-4 rounded transition ${paddingClass}`}
        onClick$={() => mobileMenuOpen.value = false}
      >
        {item.value_text}
      </a>
    );
  };

  return (
    <>
      <div class="md:hidden">
        {/* Hamburger Button */}
        <button
          onClick$={() => mobileMenuOpen.value = !mobileMenuOpen.value}
          class="text-gray-700 hover:text-purple-600 transition p-2"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen.value ? (
            // Close icon
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            // Hamburger icon
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          )}
        </button>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen.value && (
          <div class="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-40">
            <div class="container mx-auto px-6 py-4 space-y-3">
              {/* Render dynamic menu items from database */}
              {isLoading.value ? (
                <div class="py-2 px-4 text-gray-400 text-sm">Loading menu...</div>
              ) : menuItems.items.length > 0 ? (
                menuItems.items.map((item) => renderMenuItem(item, 0))
              ) : (
                <div class="py-2 px-4 text-gray-400 text-sm italic">No menu items</div>
              )}

              {/* Divider */}
              {menuItems.items.length > 0 && (
                <div class="border-t border-gray-200 my-2"></div>
              )}

              {/* Search */}
              <button
                onClick$={() => {
                  mobileMenuOpen.value = false;
                  searchModalOpen.value = true;
                }}
                class="block w-full text-left py-2 text-gray-700 hover:text-purple-600 hover:bg-gray-50 px-4 rounded transition"
              >
                🔍 Search
              </button>

              {/* Login - Only show when not authenticated */}
              {!currentUser && onOpenLogin$ && (
                <button
                  onClick$={() => {
                    mobileMenuOpen.value = false;
                    onOpenLogin$();
                  }}
                  class="block w-full text-left py-2 text-gray-700 hover:text-purple-600 hover:bg-gray-50 px-4 rounded transition"
                >
                  👤 Login
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen.value}
        onClose$={$(() => searchModalOpen.value = false)}
      />
    </>
  );
});