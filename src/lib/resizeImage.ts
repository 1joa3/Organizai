/**
 * Recorta a imagem num quadrado (pelo centro) e reduz para `size` px, em
 * JPEG. Assim a foto de perfil sobe com uns 30 KB, mesmo vinda de uma câmera
 * de 12 MP, e já no formato que o servidor aceita.
 */
export async function squareJpeg(file: File, size: number, quality = 0.86): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Não deu para ler essa imagem."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não deu para processar a imagem.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Não deu para gerar a imagem."))), "image/jpeg", quality)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
