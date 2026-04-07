import { component$, useSignal, $, useVisibleTask$, useStore } from "@builder.io/qwik";
import { SearchModal } from "../search-modal/search-modal";
import type { AuthUser } from "~/services/api";
import { MenuManagerModal } from "./menu-manager-modal";

export interface MenuItem {
  encrypted_id: string;
  encrypted_code: string;
  value_text: string;
  slug: string;
  url: string;
  order: number;
  children: MenuItem[];
}

interface DesktopMenuProps {
  currentUser?: AuthUser | null;
  onOpenLogin$?: () => void;
}

export const DesktopMenu = component$<DesktopMenuProps>(({ currentUser, onOpenLogin$ }) => {
  const searchModalOpen = useSignal(false);
  const menuManagerOpen = useSignal(false);
  const menuItems = useStore<{ items: MenuItem[] }>({ items: [] });
  const isLoading = useSignal(true);

  // Fetch menu items
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

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <div class="relative inline-block group" key={item.encrypted_id}>
          <button class="text-gray-700 hover:text-purple-600 transition duration-300 flex items-center gap-1 cursor-pointer">
            {item.value_text}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          <div class="absolute top-full left-0 min-w-[220px] bg-white rounded-lg shadow-xl opacity-0 invisible -translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 z-50 mt-2">
            {item.children.map((child, index) => (
              <div key={child.encrypted_id} class="relative group/sub">
                {/* Check if child has children (submenu) */}
                {child.children && child.children.length > 0 ? (
                  <>
                    <div class={`px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition cursor-pointer flex items-center justify-between ${index === 0 ? 'rounded-t-lg' : ''}`}>
                      {child.value_text}
                      <span class="ml-auto transition-transform group-hover/sub:translate-x-1">›</span>
                    </div>
                    <div class="absolute left-full top-0 ml-2 min-w-[220px] bg-white rounded-lg shadow-xl opacity-0 invisible -translate-y-2 group-hover/sub:opacity-100 group-hover/sub:visible group-hover/sub:translate-y-0 transition-all duration-300 z-50">
                      {child.children.map((subChild, subIndex) => (
                        <a
                          key={subChild.encrypted_id}
                          href={`/${subChild.slug}`}
                          class={`block px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition ${subIndex === 0 ? 'rounded-t-lg' : ''} ${subIndex === child.children.length - 1 ? 'rounded-b-lg' : ''}`}
                        >
                          {subChild.value_text}
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <a
                    href={`/${child.slug}`}
                    class={`block px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition ${index === 0 ? 'rounded-t-lg' : ''}`}
                  >
                    {child.value_text}
                  </a>
                )}
              </div>
            ))}

            {/* Divider and Edit Menu button for the first level dropdown */}
            {/* <div class="border-t border-gray-100"></div>
            <button
              onClick$={() => menuManagerOpen.value = true}
              class="w-full text-left px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition rounded-b-lg flex items-center justify-between cursor-pointer"
            >
              Edit Menu
              <span>✏️</span>
            </button> */}
          </div>
        </div>
      );
    }

    return (
      <div class="relative inline-block group" key={item.encrypted_id}>
        <a href={`/${item.slug}`} class="text-gray-700 hover:text-purple-600 transition duration-300">
          {item.value_text}
        </a>
      </div>
    );
  };

  return (
    <>
      <div class="hidden md:flex space-x-6 items-center">
        {/* Render dynamic items */}
        {menuItems.items.map(renderMenuItem)}

        {/* Fallback/Default if empty (optional, or just show nothing) */}
        {menuItems.items.length === 0 && !isLoading.value && (
          <div class="text-sm text-gray-400 italic">No menu items</div>
        )}

        {/* Account Menu Dropdown */}
        <div class="relative inline-block group">
          <button class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 hover:text-purple-600 transition duration-300 flex items-center justify-center cursor-pointer" title="Menu">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          <div class="absolute top-full right-0 min-w-[180px] bg-white rounded-lg shadow-xl opacity-0 invisible -translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 z-50 mt-2">
            {/* Search Item */}
            <button
              onClick$={() => searchModalOpen.value = true}
              class="w-full text-left px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition rounded-t-lg flex items-center gap-2 cursor-pointer"
              title="Search"
              aria-label="Open search">
              <span class="text-sm">🔍</span>
              <span>Search</span>
            </button>

            {!currentUser && onOpenLogin$ && (
              <>
                <div class="border-t border-gray-100"></div>
                {/* Login Item */}
                <button
                  onClick$={onOpenLogin$}
                  class="w-full text-left px-5 py-3 text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition rounded-b-lg flex items-center gap-2 cursor-pointer"
                  title="Login"
                  aria-label="Login">
                  <span class="text-sm">👤</span>
                  <span>Login</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen.value}
        onClose$={$(() => searchModalOpen.value = false)}
      />

      {/* Menu Manager Modal */}
      <MenuManagerModal
        isOpen={menuManagerOpen.value}
        onClose$={$(async () => {
          menuManagerOpen.value = false;
          // Refresh the menu when modal closes
          await fetchMenuItems();
        })}
        onUpdate$={$(async () => {
          // Refresh menu when modal triggers update (after changes)
          await fetchMenuItems();
        })}
      />
    </>
  );
});