import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import "./globals.css"

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Mandi'o | Tienda online en Paraguay",
    template: "%s | Mandi'o",
  },
  description:
    "Ropa, calzados, accesorios, hogar, juguetes y mucho más. Comprá online con envío a todo Paraguay.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PY" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
