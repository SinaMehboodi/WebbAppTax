// PWA manifest. Read more: app/api-reference/file-conventions/metadata/manifest
export default function manifest() {
  return {
    name: "SamTaxco — Gestion des impôts directs locaux",
    short_name: "SamTaxco",
    description:
      "Analysez, contestez et optimisez votre Taxe Foncière et CFE en France.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}
