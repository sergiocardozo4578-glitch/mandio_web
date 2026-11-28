import Image from "next/image"
import Link from "next/link"
import { cacheLife } from "next/cache"

const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP

export async function Footer() {
  "use cache"
  cacheLife("days")
  const year = new Date().getFullYear()

  return (
    <footer className="mt-14 border-t border-accent/40 bg-brand-dark text-cream sm:mt-20">
      <div className="store-container grid gap-8 py-10 sm:grid-cols-[1.4fr_1fr_1fr] sm:py-12">
        <div>
          <Link href="/" className="font-display text-4xl leading-none tracking-[-0.07em]">
            Mandi<span className="text-accent">&apos;</span>o
          </Link>
          <p className="mt-3 text-sm text-cream/85">Tienda online de todo un poco, hecha en Paraguay.</p>
        </div>
        <div>
          <p className="font-semibold text-accent">Ayuda</p>
          <ul className="mt-3 space-y-2 text-sm text-cream/85 [&_a:hover]:underline">
            <li><Link href="/envios">Envíos</Link></li>
            <li><Link href="/devoluciones">Cambios y devoluciones</Link></li>
            <li><Link href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
            <li><Link href="/terminos">Términos y condiciones</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-accent">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm text-cream/85 [&_a:hover]:underline">
            <li><Link href="/sucursales">Sucursales</Link></li>
            <li><Link href="/contacto">Contacto</Link></li>
            {whatsapp && <li><a href={`https://wa.me/${whatsapp}`}>WhatsApp</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-accent/20 px-4 py-4 text-center text-xs text-cream/80">
        <p>© {year} Mandi&apos;o. Todos los derechos reservados.</p>
        <p className="mt-2 flex items-center justify-center gap-1.5">
          <Image src="/nexus-solutions.webp" alt="" width={28} height={28} />
          <span>Sitio creado por <strong className="font-semibold text-cream">NEXUS SOLUTIONS</strong></span>
        </p>
      </div>
    </footer>
  )
}
