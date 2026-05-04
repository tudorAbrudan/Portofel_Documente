import { scanDocumentPages } from '@/services/documentScanner';
import scanDocument, { ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';

jest.mock('react-native-document-scanner-plugin');

describe('scanDocumentPages', () => {
  beforeEach(() => {
    (scanDocument as jest.Mock).mockReset();
  });

  it('returnează array de URI-uri pentru scanare reușită multi-pagină', async () => {
    (scanDocument as jest.Mock).mockResolvedValueOnce({
      scannedImages: ['/tmp/p1.jpg', '/tmp/p2.jpg', '/tmp/p3.jpg'],
      status: ScanDocumentResponseStatus.Success,
    });

    const result = await scanDocumentPages();
    expect(result).toEqual(['/tmp/p1.jpg', '/tmp/p2.jpg', '/tmp/p3.jpg']);
  });

  it('returnează null când userul anulează', async () => {
    (scanDocument as jest.Mock).mockResolvedValueOnce({
      scannedImages: [],
      status: ScanDocumentResponseStatus.Cancel,
    });

    const result = await scanDocumentPages();
    expect(result).toBeNull();
  });

  it('returnează null când scannedImages lipsește (success fără pagini)', async () => {
    (scanDocument as jest.Mock).mockResolvedValueOnce({
      scannedImages: [],
      status: ScanDocumentResponseStatus.Success,
    });

    const result = await scanDocumentPages();
    expect(result).toBeNull();
  });

  it('aruncă eroare cu mesaj în română la eșec nativ', async () => {
    (scanDocument as jest.Mock).mockRejectedValueOnce(new Error('camera unavailable'));

    await expect(scanDocumentPages()).rejects.toThrow(/scanare|cameră|nu s-a putut/i);
  });

  it('trimite croppedImageQuality=90 ca să mențină dimensiunea fișierului în control', async () => {
    (scanDocument as jest.Mock).mockResolvedValueOnce({
      scannedImages: ['/tmp/p1.jpg'],
      status: ScanDocumentResponseStatus.Success,
    });

    await scanDocumentPages();
    expect(scanDocument).toHaveBeenCalledWith(expect.objectContaining({ croppedImageQuality: 90 }));
  });
});
