import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel Mandi'o" },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#512737",
  width: "device-width",
  initialScale: 1,
}

/**
 * El panel es una herramienta interna pensada para el celular: oculta la
 * cabecera y el pie de la tienda (que vienen del layout raíz).
 */
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      <style>{`body:has(.mandio-panel) > header, body:has(.mandio-panel) > footer { display: none; }`}</style>
      <div className="mandio-panel min-h-dvh bg-cream">{children}</div>
    </>
  )
}
