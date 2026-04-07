import { component$, isDev, useStore } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";
import { GlobalContext } from "~/services/global-context";
import { useContextProvider } from "@builder.io/qwik";
// import { SplashScreen } from "./components/splash-screen/splash-screen";

import "./global.css";

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */

  // Save SITE DATA GLOBALLY
  // Create a reactive store
  const siteData = useStore({
    id: 0,
    domain: '',
    name: ''
  });

  // Provide it globally
  useContextProvider(GlobalContext, siteData);

  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        {!isDev && (
          <link
            rel="manifest"
            href={`${import.meta.env.BASE_URL}manifest.json`}
          />
        )}
        <RouterHead />
      </head>
      <body lang="en">
        {/* <SplashScreen /> */}
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
