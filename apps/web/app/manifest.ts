import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Instance - Open Source Sales CRM",
    short_name: "Instance",
    description:
      "Open source Sales CRM for Instagram. Connect your Instagram account, manage pipelines, track contacts, and run automations.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f23",
    theme_color: "#000000",
    orientation: "portrait-primary",
    scope: "/",
    lang: "en-US",
    dir: "ltr",
    categories: ["sales", "crm", "instagram", "dm", "automation"],
    icons: [
      { src: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
    launch_handler: { client_mode: "navigate-existing" },
  };
}
