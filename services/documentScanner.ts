import scanDocument, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';

const SCAN_QUALITY = 90 as const;

export async function scanDocumentPages(): Promise<string[] | null> {
  try {
    const result = await scanDocument({
      croppedImageQuality: SCAN_QUALITY,
      responseType: ResponseType.ImageFilePath,
    });

    if (result.status !== ScanDocumentResponseStatus.Success) {
      return null;
    }
    if (!result.scannedImages || result.scannedImages.length === 0) {
      return null;
    }
    return result.scannedImages;
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'eroare necunoscută';
    throw new Error(`Nu s-a putut porni scanarea: ${detail}`);
  }
}
