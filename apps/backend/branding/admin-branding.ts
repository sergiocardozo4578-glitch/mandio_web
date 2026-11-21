import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Marca Nexus en el panel admin de Medusa.
 *
 * Medusa no trae una opción para cambiar su logo ni el título de la pestaña, así que
 * se usa la vía oficial para ajustar el build del admin (admin.vite en medusa-config):
 * un plugin de Vite que modifica el index.html del panel.
 *  - Ícono de la pestaña: emblema Nexus.
 *  - Logo del login / invitación / reset de contraseña: emblema Nexus en lugar del de Medusa.
 *  - Título de la pestaña: "… - Nexus" en lugar de "… - Medusa".
 * Los textos ("Bienvenido a Nexus") van por traducciones en src/admin/i18n.
 *
 * Si una actualización de Medusa cambia el login, revisar el selector CSS de abajo.
 */

const BRAND = "Nexus"

const dataUri = (file: string) =>
  `data:image/png;base64,${readFileSync(join(__dirname, file)).toString("base64")}`

export function nexusAdminBranding() {
  const tile = dataUri("nexus-tile-256.png")
  const favicon = dataUri("nexus-favicon-64.png")

  // El logo de Medusa en el login es un <svg class="rounded-[10px]"> dentro de una caja de 50x50.
  const css = `
    [class*="h-[50px]"][class*="w-[50px]"][class*="rounded-xl"] {
      background: url("${tile}") center / cover no-repeat !important;
      box-shadow: none !important;
    }
    [class*="h-[50px]"][class*="w-[50px]"][class*="rounded-xl"]::after { display: none !important; }
    [class*="h-[50px]"][class*="w-[50px]"][class*="rounded-xl"] > svg.rounded-\\[10px\\] { visibility: hidden !important; }
  `

  // react-helmet pone "Página - Medusa": se reemplaza cada vez que cambia el título.
  const titleScript = `
    (function () {
      var fix = function () {
        if (document.title.indexOf("Medusa") !== -1) document.title = document.title.replace(/Medusa/g, ${JSON.stringify(BRAND)});
      };
      new MutationObserver(fix).observe(document.head, { subtree: true, childList: true, characterData: true });
      fix();
    })();
  `

  return {
    name: "nexus-admin-branding",
    transformIndexHtml(html: string) {
      return html
        .replace(/<link rel="icon"[^>]*data-placeholder-favicon[^>]*\/?>/, "")
        .replace(
          "</head>",
          `<link rel="icon" type="image/png" href="${favicon}" />
<title>${BRAND}</title>
<style>${css}</style>
<script>${titleScript}</script>
</head>`
        )
    },
  }
}
