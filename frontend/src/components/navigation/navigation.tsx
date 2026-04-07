import { component$ } from "@builder.io/qwik";
import { LogoText } from "./logo-text";
import { DesktopMenu } from "../navigation/desktop-menu";
import { MobileMenu } from "../navigation/mobile-menu";
import { LogoImage } from "../navigation/logo-image";
import type { AuthUser } from "~/services/api";

interface NavigationProps {
  currentUser?: AuthUser | null;
  onOpenLogin$?: () => void;
}

export const Navigation = component$<NavigationProps>(({ currentUser, onOpenLogin$ }) => {
  return (
    <>
      {/* Navigation */}
      <nav class="bg-white shadow-md fixed w-full top-0 z-40">
        <div class="container mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            {/* Logo with Overlay */}
            <div class="flex items-center gap-2 flex-nowrap">
              <LogoImage />
              <LogoText />
            </div>

            {/* Desktop Menu */}
            <DesktopMenu currentUser={currentUser} onOpenLogin$={onOpenLogin$} />

            {/* Mobile Menu Button */}
            <MobileMenu currentUser={currentUser} onOpenLogin$={onOpenLogin$} />
          </div>
        </div>
      </nav>
    </>
  );
});