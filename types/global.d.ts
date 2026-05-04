declare module 'react-native-document-scanner-plugin' {
  export enum ScanDocumentResponseStatus {
    Success = 'success',
    Cancel = 'cancel',
  }
  export enum ResponseType {
    ImageFilePath = 'imageFilePath',
    Base64 = 'base64',
  }
  export interface ScanDocumentOptions {
    croppedImageQuality?: number;
    maxNumDocuments?: number;
    responseType?: ResponseType;
  }
  export interface ScanDocumentResponse {
    scannedImages?: string[];
    status?: ScanDocumentResponseStatus;
  }
  export default function scanDocument(
    options?: ScanDocumentOptions
  ): Promise<ScanDocumentResponse>;
  export { scanDocument };
}
