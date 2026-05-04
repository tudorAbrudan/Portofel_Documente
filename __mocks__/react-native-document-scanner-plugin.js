// Mock for react-native-document-scanner-plugin — Jest environment only.
// Mirror the real module shape: default export is an OBJECT with `scanDocument` as a method,
// not a callable function. __esModule lets babel-jest interop resolve named + default imports.
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
  default: { scanDocument },
  ScanDocumentResponseStatus,
  ResponseType,
};
