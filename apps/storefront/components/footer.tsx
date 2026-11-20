import Link from "next/link"
import { cacheLife } from "next/cache"

const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP

export async function Footer() {
  "use cache"
  cacheLife("days")
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-line bg-brand-dark text-cream">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-extrabold">Mandi&apos;o</p>
          <p className="mt-2 text-sm opacity-80">Tienda online de todo un poco, hecha en Paraguay.</p>
        </div>
        <div>
          <p className="font-semibold">Ayuda</p>
          <ul className="mt-2 space-y-1 text-sm opacity-80">
            <li><Link href="/envios">Envíos</Link></li>
            <li><Link href="/devoluciones">Cambios y devoluciones</Link></li>
            <li><Link href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
            <li><Link href="/terminos">Términos y condiciones</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Contacto</p>
          <ul className="mt-2 space-y-1 text-sm opacity-80">
            <li><Link href="/sucursales">Sucursales</Link></li>
            <li><Link href="/contacto">Contacto</Link></li>
            {whatsapp && <li><a href={`https://wa.me/${whatsapp}`}>WhatsApp</a></li>}
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs opacity-70">
        © {year} Mandi&apos;o. Todos los derechos reservados.
      </p>
    </footer>
  )
}
