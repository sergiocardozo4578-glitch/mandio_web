import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-6xl text-brand">404</p>
      <h1 className="section-title mt-4">No encontramos esta página</h1>
      <p className="mt-2 text-muted">Puede que el producto ya no esté disponible o que el enlace haya cambiado.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark">
          Ir al inicio
        </Link>
        <Link href="/tienda" className="rounded-full border border-line px-6 py-3 font-bold hover:border-brand">
          Ver la tienda
        </Link>
      </div>
    </div>
  )
}
