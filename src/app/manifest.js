// PWA manifest. Read more: app/api-reference/file-conventions/metadata/manifest
//
// The single SVG icon at /icon.svg scales to every size Chrome/Safari need
// for the home-screen install prompt, splash screen, and task switcher.
export default function manifest() {
  return {
    name: "SamTaxco — Gestion des impôts directs locaux",
    short_name: "SamTaxco",
    description:
      "Analysez, contestez et optimisez votre Taxe Foncière et CFE en France.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
