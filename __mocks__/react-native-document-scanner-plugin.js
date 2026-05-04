// Mock for react-native-document-scanner-plugin — Jest environment only.
// __esModule: true is required so default and named imports both resolve via babel-jest ESM interop.
const ScanDocumentResponseStatus = {
  Success: 'success',
  Cancel: 'cancel',
};

const ResponseType = {
  ImageFilePath: 'imageFilePath',
  Base64: 'base64',
};

const scanDocument = jest.fn(() =>
  Promise.resolve({
    scannedImages: ['/tmp/scan_mock_1.jpg'],
    status: ScanDocumentResponseStatus.Success,
  })
);

module.exports = {
  __esModule: true,
  default: scanDocument,
  scanDocument,
  ScanDocumentResponseStatus,
  ResponseType,
};
