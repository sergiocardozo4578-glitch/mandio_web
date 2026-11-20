"use client"

import Image from "next/image"
import { useState } from "react"

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const current = images[active]

  if (!images.length) {
    return <div className="aspect-square rounded-3xl bg-line/60" />
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-surface"
        aria-label="Ampliar imagen"
      >
        <Image src={current} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
      </button>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <li key={src + i} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === active}
                className={`relative block h-20 w-20 overflow-hidden rounded-xl border-2 ${i === active ? "border-brand" : "border-transparent"}`}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setZoom(false)}
          onKeyDown={(e) => e.key === "Escape" && setZoom(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative h-full max-h-[90vh] w-full max-w-4xl">
            <Image src={current} alt={title} fill sizes="100vw" className="object-contain" />
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink"
          >
            Cerrar ✕
          </button>
        </div>
      )}
    </div>
  )
}
