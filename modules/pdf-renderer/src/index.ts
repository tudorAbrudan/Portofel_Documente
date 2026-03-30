import { requireNativeModule } from 'expo-modules-core';

const PdfRenderer = requireNativeModule('PdfRenderer');

/**
 * Returnează numărul de pagini ale unui PDF.
 * @param filePath URI local (file:// sau path absolut)
 */
export async function getPdfPageCount(filePath: string): Promise<number> {
  return PdfRenderer.getPageCount(filePath);
}

/**
 * Redă o pagină PDF ca imagine JPEG salvată în temp.
 * @param filePath URI local (file:// sau path absolut)
 * @param pageIndex Index 0-based
 * @param scale Factor de scalare (1.5 = rezoluție bună pentru OCR)
 * @returns file:// URI al imaginii JPEG generate
 */
export async function renderPdfPage(
  filePath: string,
  pageIndex: number,
  scale = 1.5
): Promise<string> {
  return PdfRenderer.renderPage(filePath, pageIndex, scale);
}
