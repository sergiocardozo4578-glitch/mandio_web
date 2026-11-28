import Image from "next/image"
import Link from "next/link"
import { CategoryNav } from "@/components/category-nav"
import { CartButton } from "@/components/cart/cart-button"
import { SearchBox } from "@/components/search-box"
import { getCategoryTree } from "@/lib/medusa"

export async function Header() {
  const categories = await getCategoryTree()

  return (
    <header className="relative z-30 border-t-[3px] border-t-accent border-b border-line bg-surface lg:sticky lg:top-0">
      <div className="store-container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-3 md:grid-cols-[1fr_minmax(14rem,27rem)_1fr] md:py-4">
        <Link href="/" className="inline-flex w-fit items-center gap-2 font-display text-[2rem] leading-none tracking-[-0.07em] text-brand-dark sm:text-[2.5rem]">
          <Image src="/mandio-store.webp" alt="" width={56} height={56} className="size-10 shrink-0 rounded-full sm:size-14" />
          <span>Mandi<span className="text-accent-dark">&apos;</span>o</span>
        </Link>

        <SearchBox className="order-3 col-span-2 w-full md:order-2 md:col-span-1" />

        <nav aria-label="Mi compra" className="order-2 flex items-center justify-end gap-2 text-sm font-bold text-brand-dark sm:gap-4 md:order-3">
          <Link href="/favoritos" className="grid h-10 w-10 place-items-center rounded-full border border-line text-xl leading-none transition-colors hover:bg-rosewash" aria-label="Favoritos">
            <span aria-hidden="true">♡</span>
          </Link>
          <Link href="/cuenta" className="hidden whitespace-nowrap hover:text-brand sm:inline">Mi cuenta</Link>
          <CartButton />
        </nav>
      </div>

      <CategoryNav categories={categories} />
    </header>
  )
}
