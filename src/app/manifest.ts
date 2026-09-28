import type { MetadataRoute } from "next";

const shortcutIcon = [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Little Doo Mud Bog",
    short_name: "Little Doo",
    description: "Race schedule and results for Little Doo Mud Bog in Newport, NC.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#d97706",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Home", short_name: "Home", url: "/", icons: shortcutIcon },
      { name: "Events", short_name: "Events", url: "/events", icons: shortcutIcon },
      { name: "Results", short_name: "Results", url: "/race-results", icons: shortcutIcon },
    ],
  };
}
