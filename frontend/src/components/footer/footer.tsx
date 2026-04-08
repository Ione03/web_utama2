import { component$, useStore, useVisibleTask$ } from "@builder.io/qwik";
import type { MenuItem } from "../navigation/desktop-menu";
import { LogoImage } from "../navigation/logo-image";
import { LogoText } from "../navigation/logo-text";
import { AboutText } from "./about-text";
// import { PlainText } from "../plain-text";
import { CopyrightText } from "./copyright-text";
import { CopyrightYearText } from "./copyright-year-text";
import { SocialLinks } from "./social-links";

export const Footer = component$(() => {
  const menuItems = useStore<{ items: MenuItem[] }>({ items: [] });
  const isLoading = useStore({ value: true });

  // Fetch bottom menu items
  useVisibleTask$(async () => {
    try {
      const response = await fetch('/api/contents/navigation/bottom/');
      if (response.ok) {
        menuItems.items = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch footer menu:", error);
    } finally {
      isLoading.value = false;
    }
  });

  return (
    <footer class="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-2">
      <div class="py-12">
        {/* Footer Content */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Section - Static */}
          <div>
            <div class="flex items-center gap-2 mb-4">
              {/* bg-gradient-to-br from-blue-500 to-cyan-500  */}
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-2xl">
                <LogoImage />

              </div>
              <h2 class="text-xl font-bold gradient-text">
                <LogoText />
              </h2>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {/* Your trusted source for breaking news, trending stories, and in-depth analysis from around the world. */}
              <AboutText />
            </p>
          </div>

          {/* Dynamic Menu Sections from Database */}
          {menuItems.items.map((section) => (
            <div key={section.encrypted_id}>
              <h3 class="font-bold text-slate-900 dark:text-white mb-4">{section.value_text}</h3>
              {section.children && section.children.length > 0 && (
                <ul class="space-y-2 text-sm">
                  {section.children.map((item) => (
                    <li key={item.encrypted_id}>
                      <a
                        href={`/${item.slug}`}
                        class="text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-smooth"
                      >
                        {item.value_text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div class="pt-8 border-t border-slate-200 dark:border-slate-800">
          <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-sm text-slate-600 dark:text-slate-400">
              {/* All rights reserved. */}
              © <CopyrightYearText /> <LogoText class="capitalize" />. <CopyrightText />
            </p>
            {/* Social Links */}
            <SocialLinks />
          </div>
        </div>
      </div>
    </footer>
  );
});
