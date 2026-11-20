/**
 * Achica una foto en el navegador antes de subirla: las del celular pesan 3-10 MB
 * y la tienda no necesita más de 1600 px. WebP al 85 % suele dejarla en 150-400 KB.
 * Si el navegador no puede leer el formato, se sube el original.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" })
  } catch {
    return file
  }
}
