// Textos propios del admin. Se combinan con los de Medusa (deepMerge) y los reemplazan:
// acá se cambia la marca "Medusa" por "Nexus" en la pantalla de login e invitaciones.
import en from "./json/en.json" with { type: "json" }
import es from "./json/es.json" with { type: "json" }

export default {
  en: { translation: en },
  es: { translation: es },
}
