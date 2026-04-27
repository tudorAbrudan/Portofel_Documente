// Mock pentru react-native-cloud-storage — folosit în teste Jest.
// Native module-ul iCloud nu există în mediul de test, deci stub-uim
// suprafața folosită de services/cloudStorage.ts.

class CloudStorage {
  constructor(_provider, _options) {}
  async isCloudAvailable() {
    return false;
  }
  async exists(_path) {
    return false;
  }
  async readFile(_path) {
    throw new Error('cloud unavailable in tests');
  }
  async writeFile(_path, _content) {}
  async unlink(_path) {}
  async readdir(_path) {
    return [];
  }
  async stat(_path) {
    return { size: 0, isFile: () => true, isDirectory: () => false };
  }
  async mkdir(_path) {}
  async uploadFile(_localUri, _remotePath) {}
  async downloadFile(_remotePath, _localUri) {}
}

const CloudStorageProvider = { ICloud: 'iCloud', GoogleDrive: 'googleDrive' };
const CloudStorageScope = { Documents: 'documents', AppData: 'appData' };

module.exports = {
  CloudStorage,
  CloudStorageProvider,
  CloudStorageScope,
};
