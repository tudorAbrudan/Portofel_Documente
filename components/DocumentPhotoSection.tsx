import { useState, useRef } from 'react';
import {
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { WebView } from 'react-native-webview';
import { Text, View } from '@/components/Themed';
import { primary } from '@/theme/colors';
import Colors from '@/constants/Colors';
import { isPdfFile } from '@/services/pdfExtractor';

export interface PhotoPage {
  id: string;
  uri: string;
}

interface Props {
  pages: PhotoPage[];
  ocrLoading: boolean;
  ocrText?: string;
  isEditing?: boolean;
  onAddPage: () => void;
  onRotate: (pageId: string, degrees: number) => void;
  onDelete: (pageId: string) => void;
  onRunOcr: () => void;
  onFullscreen: (uri: string) => void;
  onReorderPage?: (fromIndex: number, toIndex: number) => void;
  onOcrTextSave?: (text: string) => Promise<void>;
}

export function DocumentPhotoSection({
  pages,
  ocrLoading,
  ocrText,
  isEditing = true,
  onAddPage,
  onRotate,
  onDelete,
  onRunOcr,
  onFullscreen,
  onReorderPage,
  onOcrTextSave,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [ocrEditing, setOcrEditing] = useState(false);
  const [ocrDraft, setOcrDraft] = useState('');
  const [ocrSaving, setOcrSaving] = useState(false);
  // Previne auto-save la onBlur când utilizatorul apasă "Anulare"
  const ocrCancelledRef = useRef(false);

  const canReorder = isEditing && pages.length > 1 && !!onReorderPage;

  async function handleOcrSave() {
    if (!onOcrTextSave) return;
    setOcrSaving(true);
    try {
      await onOcrTextSave(ocrDraft);
      setOcrEditing(false);
    } finally {
      setOcrSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {pages.map((page, idx) => {
        const pageIsPdf = isPdfFile(page.uri) || isPdfFile(page.id);
        const isFirst = idx === 0;
        const isLast = idx === pages.length - 1;
        return (
          <View key={page.id} style={[styles.imageWrap, { backgroundColor: C.surface }]}>
            {pages.length > 1 && (
              <Text style={styles.pageLabel}>
                Pagina {idx + 1} / {pages.length}
              </Text>
            )}
            <View style={[styles.imageContainer, { width: screenWidth - 40 }]}>
              {pageIsPdf ? (
                Platform.OS === 'ios' ? (
                  <WebView
                    source={{
                      uri: page.uri.startsWith('file://') ? page.uri : `file://${page.uri}`,
                    }}
                    style={[styles.pdfWebView, { width: screenWidth - 40 }]}
                    originWhitelist={['file://*', '*']}
                    allowFileAccess
                  />
                ) : (
                  <View style={[styles.pdfPlaceholder, { width: screenWidth - 40, backgroundColor: C.surface }]}>
                    <Text style={styles.pdfIcon}>📄</Text>
                    <Text style={styles.pdfLabel}>Document PDF</Text>
                    <Text style={styles.pdfSubLabel}>Vizualizare disponibilă după salvare</Text>
                  </View>
                )
              ) : (
                <Image
                  source={{ uri: page.uri }}
                  style={[styles.image, { width: screenWidth - 40, backgroundColor: C.surface }]}
                  resizeMode="contain"
                />
              )}
              {!pageIsPdf && (
                <Pressable style={styles.fullscreenBtn} onPress={() => onFullscreen(page.uri)}>
                  <Text style={styles.fullscreenBtnText}>⤢</Text>
                </Pressable>
              )}
            </View>
            {/* Rotate / reorder / delete bar — doar în modul editare */}
            {isEditing && (
              <View style={styles.rotateBar}>
                {canReorder && (
                  <>
                    <Pressable
                      style={[styles.rotateBtn, styles.rotateBtnReorder, styles.rotateBtnBorderRight, isFirst && styles.btnDisabled]}
                      onPress={() => !isFirst && onReorderPage!(idx, idx - 1)}
                      disabled={isFirst}
                    >
                      <Text style={[styles.rotateBtnText, isFirst && styles.disabledText]}>↑</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.rotateBtn, styles.rotateBtnReorder, styles.rotateBtnBorderRight, isLast && styles.btnDisabled]}
                      onPress={() => !isLast && onReorderPage!(idx, idx + 1)}
                      disabled={isLast}
                    >
                      <Text style={[styles.rotateBtnText, isLast && styles.disabledText]}>↓</Text>
                    </Pressable>
                  </>
                )}
                {!pageIsPdf && (
                  <>
                    <Pressable
                      style={[styles.rotateBtn, styles.rotateBtnBorderRight]}
                      onPress={() => onRotate(page.id, -90)}
                    >
                      <Text style={styles.rotateBtnText}>↺ Rotește</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.rotateBtn, styles.rotateBtnBorderRight]}
                      onPress={() => onRotate(page.id, 90)}
                    >
                      <Text style={styles.rotateBtnText}>↻ Rotește</Text>
                    </Pressable>
                  </>
                )}
                <Pressable style={styles.rotateBtn} onPress={() => onDelete(page.id)}>
                  <Text style={[styles.rotateBtnText, styles.deleteText]}>Șterge</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      {/* Add page + OCR — doar în modul editare */}
      {isEditing && (
        <View style={styles.photoActionsRow}>
          <Pressable style={styles.photoActionBtn} onPress={onAddPage}>
            <Text style={styles.photoActionBtnText}>
              {pages.length === 0 ? '+ Adaugă fișier' : '+ Fișier nou'}
            </Text>
          </Pressable>
          {pages.length > 0 && (
            <Pressable
              style={[styles.photoActionBtn, ocrLoading && styles.btnDisabled]}
              onPress={onRunOcr}
              disabled={ocrLoading}
            >
              {ocrLoading ? (
                <View style={styles.ocrLoadingRow}>
                  <ActivityIndicator size="small" color={primary} />
                  <Text style={styles.ocrLoadingText}> OCR...</Text>
                </View>
              ) : (
                <Text style={styles.photoActionBtnText}>
                  🔍 OCR{pages.length > 1 ? ` (${pages.length})` : ''}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {ocrText !== undefined && ocrText !== '' ? (
        <View style={[styles.ocrSection, { borderColor: C.border }]}>
          <Pressable
            onPress={() => {
              if (!ocrEditing) setOcrExpanded(v => !v);
            }}
            style={styles.ocrToggleRow}
          >
            <Text style={styles.ocrToggleLabel}>Text complet (OCR)</Text>
            <View style={styles.ocrToggleRight}>
              {isEditing && onOcrTextSave && !ocrEditing && (
                <Pressable
                  style={styles.ocrEditBtn}
                  onPress={() => {
                    setOcrDraft(ocrText ?? '');
                    setOcrEditing(true);
                    setOcrExpanded(true);
                  }}
                >
                  <Text style={styles.ocrEditBtnText}>✎</Text>
                </Pressable>
              )}
              {!ocrEditing && (
                <Text style={styles.ocrToggleChevron}>{ocrExpanded ? '▲ Ascunde' : '▼ Arată'}</Text>
              )}
            </View>
          </Pressable>
          {ocrExpanded && !ocrEditing && (
            <Text
              style={[styles.ocrText, { backgroundColor: C.background, color: C.text }]}
              selectable
            >
              {ocrText}
            </Text>
          )}
          {ocrExpanded && ocrEditing && (
            <View style={{ backgroundColor: C.background }}>
              <TextInput
                style={[styles.ocrTextInput, { color: C.text, borderColor: C.border }]}
                value={ocrDraft}
                onChangeText={setOcrDraft}
                multiline
                autoFocus
                textAlignVertical="top"
                onBlur={() => {
                  if (!ocrCancelledRef.current && onOcrTextSave) {
                    onOcrTextSave(ocrDraft).catch(() => {});
                  }
                  ocrCancelledRef.current = false;
                }}
              />
              <View style={styles.ocrEditActions}>
                <Pressable
                  style={[styles.ocrActionBtn, styles.ocrCancelBtn, { borderColor: C.border }]}
                  onPress={() => {
                    ocrCancelledRef.current = true;
                    setOcrEditing(false);
                  }}
                  disabled={ocrSaving}
                >
                  <Text style={[styles.ocrActionBtnText, { color: C.textSecondary }]}>Anulare</Text>
                </Pressable>
                <Pressable
                  style={[styles.ocrActionBtn, styles.ocrSaveBtn, ocrSaving && styles.btnDisabled]}
                  onPress={handleOcrSave}
                  disabled={ocrSaving}
                >
                  {ocrSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.ocrSaveBtnText}>Salvează</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  imageWrap: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  imageContainer: { position: 'relative' },
  image: { height: 260 },
  pdfWebView: {
    height: 420,
    borderRadius: 8,
  },
  pdfPlaceholder: {
    height: 180,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2ebd4',
    borderStyle: 'dashed',
  },
  pdfIcon: { fontSize: 40 },
  pdfLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  pdfSubLabel: { fontSize: 12, color: '#888', textAlign: 'center', paddingHorizontal: 16 },
  fullscreenBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBtnText: { color: '#fff', fontSize: 16 },

  // Segmented control row for reorder/rotate/delete
  rotateBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  rotateBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotateBtnReorder: {
    flex: 0,
    width: 36,
  },
  rotateBtnBorderRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#ccc',
  },
  rotateBtnText: { color: primary, fontSize: 13, fontWeight: '500' },
  deleteText: { color: '#E53935' },
  disabledText: { opacity: 0.3 },

  // Add page + OCR side by side
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  photoActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActionBtnText: { color: primary, fontWeight: '500', fontSize: 14 },
  ocrLoadingRow: { flexDirection: 'row', alignItems: 'center' },
  ocrLoadingText: { color: primary, fontSize: 13 },
  btnDisabled: { opacity: 0.5 },

  ocrSection: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  ocrToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ocrToggleLabel: { fontSize: 14, opacity: 0.9, fontWeight: '500' },
  ocrToggleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ocrToggleChevron: { color: primary, fontSize: 13, fontWeight: '500' },
  ocrEditBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  ocrEditBtnText: { color: primary, fontSize: 13, fontWeight: '500' },
  ocrText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.75,
    fontFamily: 'Courier',
    padding: 12,
  },
  ocrTextInput: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Courier',
    padding: 12,
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 8,
    margin: 8,
  },
  ocrEditActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    paddingTop: 4,
  },
  ocrActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrCancelBtn: {
    borderWidth: 1,
  },
  ocrSaveBtn: {
    backgroundColor: primary,
  },
  ocrActionBtnText: { fontSize: 14, fontWeight: '500' },
  ocrSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
