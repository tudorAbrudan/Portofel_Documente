/**
 * Utilități pentru gestionarea path-urilor fișierelor.
 *
 * Problemă rezolvată: iOS poate schimba UUID-ul containerului aplicației
 * (ex. după update/restore), invalidând path-urile absolute stocate în SQLite.
 *
 * Soluție: stocăm path-uri RELATIVE (ex. "documents/doc_xxx.jpg") în baza de date
 * și le rezolvăm la path-uri absolute la momentul afișării/citirii.
 *
 * Format vechi (backwards compat): path-uri absolute cu sau fără "file://"
 * Format nou: path relativ față de documentDirectory (ex. "documents/doc_xxx.jpg")
 */
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Convertește orice path stocat (relativ sau absolut) la un URI file:// valid pentru
 * ImagePicker, expo-file-system, etc.
 */
export function toFileUri(storedPath: string): string {
  if (!storedPath) return '';
  if (storedPath.startsWith('file://')) return storedPath;
  if (storedPath.startsWith('/')) return `file://${storedPath}`;
  // Path relativ → prepend documentDirectory
  return `${FileSystem.documentDirectory ?? ''}${storedPath}`;
}

/**
 * Convertește un path absolut (cu sau fără file://) la path relativ față de documentDirectory.
 * Dacă deja e relativ, îl returnează neschimbat.
 */
export function toRelativePath(absolutePathOrUri: string): string {
  if (!absolutePathOrUri) return absolutePathOrUri;

  // Deja relativ (nu are schemă sau slash inițial)
  if (!absolutePathOrUri.startsWith('file://') && !absolutePathOrUri.startsWith('/')) {
    return absolutePathOrUri;
  }

  const base = FileSystem.documentDirectory ?? '';
  // base este de forma "file:///var/mobile/.../Documents/"

  if (absolutePathOrUri.startsWith(base)) {
    return absolutePathOrUri.slice(base.length);
  }

  // Încearcă fără prefixul file://
  const basePath = base.replace(/^file:\/\//, '');
  const inputPath = absolutePathOrUri.replace(/^file:\/\//, '');
  if (inputPath.startsWith(basePath)) {
    return inputPath.slice(basePath.length);
  }

  // Nu se poate converti (path extern) — returnează ca atare
  return absolutePathOrUri;
}
