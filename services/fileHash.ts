import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

export async function computeFileHash(absolutePath: string): Promise<string | null> {
  try {
    const content = await FileSystem.readAsStringAsync(absolutePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
  } catch {
    return null;
  }
}
