/**
 * Achica las fotos antes de subirlas: las del celular pesan 3-10 MB y la tienda
 * no necesita más de 1600 px. WebP al 85 % suele dejar cada foto en 150-400 KB.
 * Si el navegador no puede leer el formato (p. ej. HEIC fuera de Safari), se sube el original.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp"
    return new File([blob], name, { type: "image/webp" })
  } catch {
    return file
  }
}

/** "remera_negra-oversize (2).jpg" → "Remera negra oversize" */
export function titleFromFileName(name: string) {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/\(\d+\)/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  // Nombres genéricos de cámara (IMG_1234, DSC0001, WhatsApp Image…) no sirven como título
  if (!base || /^(img|dsc|pxl|photo|image|whatsapp image|screenshot|captura)\b/i.test(base) || /^\d+$/.test(base)) {
    return ""
  }
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
}
