import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, Pressable, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { Text, View, ThemedTextInput } from '@/components/Themed';
import { primary } from '@/theme/colors';
import { useEntities } from '@/hooks/useEntities';
import { useDocuments } from '@/hooks/useDocuments';
import { DOCUMENT_TYPE_LABELS } from '@/types';
import type { Document as DocType, DocumentType } from '@/types';

export default function EntityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const {
    persons,
    properties,
    vehicles,
    cards,
    refresh: refreshEntities,
    deletePerson,
    deleteProperty,
    deleteVehicle,
    deleteCard,
    updatePerson,
    updateProperty,
    updateVehicle,
    updateCard,
  } = useEntities();
  const { getDocumentsByEntity } = useDocuments();

  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityName, setEntityName] = useState('');
  const [entityKind, setEntityKind] = useState<'person_id' | 'property_id' | 'vehicle_id' | 'card_id'>('person_id');

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editLast4, setEditLast4] = useState('');
  const [editExpiry, setEditExpiry] = useState('');

  useEffect(() => {
    if (!id) return;
    const person = persons.find((p) => p.id === id);
    const property = properties.find((p) => p.id === id);
    const vehicle = vehicles.find((v) => v.id === id);
    const card = cards.find((c) => c.id === id);
    if (person) {
      setEntityName(person.name);
      setEntityKind('person_id');
    } else if (property) {
      setEntityName(property.name);
      setEntityKind('property_id');
    } else if (vehicle) {
      setEntityName(vehicle.name);
      setEntityKind('vehicle_id');
    } else if (card) {
      setEntityName(card.nickname || 'Card');
      setEntityKind('card_id');
    }
  }, [id, persons, properties, vehicles, cards]);

  async function loadDocs(kind: typeof entityKind, entityId: string) {
    if (!entityId) return;
    setLoading(true);
    try {
      const list = await getDocumentsByEntity(kind, entityId);
      setDocuments(list);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id || !entityName) return;
    loadDocs(entityKind, id);
  }, [id, entityKind, entityName]);

  useFocusEffect(useCallback(() => { refreshEntities(); }, []));

  const refresh = () => {
    refreshEntities();
    if (id && entityName) loadDocs(entityKind, id);
  };

  const handleDelete = () => {
    Alert.alert('Ștergere', `Ștergi „${entityName}"? Documentele legate nu vor fi șterse.`, [
      { text: 'Anulare', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          try {
            if (entityKind === 'person_id') await deletePerson(id!);
            else if (entityKind === 'property_id') await deleteProperty(id!);
            else if (entityKind === 'vehicle_id') await deleteVehicle(id!);
            else await deleteCard(id!);
            router.back();
          } catch (e) {
            Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut șterge');
          }
        },
      },
    ]);
  };

  const openEditModal = () => {
    if (entityKind === 'card_id') {
      const card = cards.find((c) => c.id === id);
      setEditNickname(card?.nickname ?? '');
      setEditLast4(card?.last4 ?? '');
      setEditExpiry(card?.expiry ?? '');
    } else {
      setEditName(entityName);
    }
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (entityKind === 'card_id') {
      if (!editNickname.trim()) {
        Alert.alert('Eroare', 'Introdu un nickname pentru card.');
        return;
      }
    } else {
      if (!editName.trim()) {
        Alert.alert('Eroare', 'Introdu un nume.');
        return;
      }
    }

    setEditLoading(true);
    try {
      if (entityKind === 'person_id') await updatePerson(id!, editName.trim());
      else if (entityKind === 'property_id') await updateProperty(id!, editName.trim());
      else if (entityKind === 'vehicle_id') await updateVehicle(id!, editName.trim());
      else await updateCard(id!, editNickname.trim(), editLast4.trim() || '****', editExpiry.trim() || undefined);
      await refreshEntities();
      setEditVisible(false);
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut salva');
    } finally {
      setEditLoading(false);
    }
  };

  const isCard = entityKind === 'card_id';

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{entityName || '...'}</Text>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
          onPress={openEditModal}>
          <Text style={styles.editBtnText}>Editează</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
        <Text style={styles.sectionTitle}>Documente legate</Text>
        {documents.length === 0 && !loading && (
          <Text style={styles.empty}>Niciun document. Adaugă unul de mai jos.</Text>
        )}
        {documents.map((doc) => (
          <Pressable
            key={doc.id}
            style={({ pressed }) => [
              styles.docRow,
              { backgroundColor: colors.card },
              pressed && styles.docRowPressed,
            ]}
            onPress={() =>
              router.push({ pathname: '/(tabs)/documente/[id]', params: { id: doc.id } })
            }>
            <View style={styles.docRowInner}>
              <View style={styles.docRowText}>
                <Text style={styles.docType}>{DOCUMENT_TYPE_LABELS[doc.type]}</Text>
                {doc.issue_date && (
                  <Text style={styles.docMeta}>Emis: {doc.issue_date}</Text>
                )}
                {doc.expiry_date && (
                  <Text style={styles.docMeta}>Expiră: {doc.expiry_date}</Text>
                )}
              </View>
              <Text style={styles.docChevron}>›</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {entityKind === 'vehicle_id' && (
        <Pressable
          style={({ pressed }) => [styles.fuelBtn, pressed && styles.vignetaBtnPressed]}
          onPress={() =>
            router.push(
              `/(tabs)/entitati/fuel?vehicleId=${id}&vehicleName=${encodeURIComponent(entityName)}`
            )
          }>
          <Text style={styles.fuelBtnText}>{'⛽ Carburant & Revizii'}</Text>
        </Pressable>
      )}

      {entityKind === 'vehicle_id' && (
        <Pressable
          style={({ pressed }) => [styles.vignetaBtn, pressed && styles.vignetaBtnPressed]}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/entitati/vigneta',
              params: { vehicleId: id },
            })
          }>
          <Text style={styles.vignetaBtnText}>🌍 Vignetă la graniță</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.deleteBtn}
        onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>Șterge entitate</Text>
      </Pressable>

      <Pressable
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/documente/add',
            params: { [entityKind]: id },
          })
        }>
        <Text style={styles.fabText}>+ Adaugă document</Text>
      </Pressable>

      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editează entitate</Text>

            {!isCard && (
              <>
                <Text style={styles.modalLabel}>Nume</Text>
                <ThemedTextInput
                  style={styles.modalInput}
                  placeholder="Nume"
                  value={editName}
                  onChangeText={setEditName}
                  editable={!editLoading}
                />
              </>
            )}

            {isCard && (
              <>
                <Text style={styles.modalLabel}>Nickname</Text>
                <ThemedTextInput
                  style={styles.modalInput}
                  placeholder="Nickname card"
                  value={editNickname}
                  onChangeText={setEditNickname}
                  editable={!editLoading}
                />
                <Text style={styles.modalLabel}>Ultimele 4 cifre</Text>
                <ThemedTextInput
                  style={styles.modalInput}
                  placeholder="1234"
                  value={editLast4}
                  onChangeText={(t) => setEditLast4(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  editable={!editLoading}
                />
                <Text style={styles.modalLabel}>Expirare MM/AA (opțional)</Text>
                <ThemedTextInput
                  style={styles.modalInput}
                  placeholder="12/28"
                  value={editExpiry}
                  onChangeText={setEditExpiry}
                  editable={!editLoading}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.buttonPressed]}
                onPress={() => setEditVisible(false)}
                disabled={editLoading}>
                <Text style={styles.modalCancelText}>Anulare</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSaveBtn, pressed && styles.buttonPressed]}
                onPress={handleSaveEdit}
                disabled={editLoading}>
                <Text style={styles.modalSaveText}>{editLoading ? 'Se salvează...' : 'Salvează'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', flex: 1, marginRight: 12 },
  editBtn: {
    borderWidth: 1,
    borderColor: primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editBtnPressed: { opacity: 0.7 },
  editBtnText: { color: primary, fontSize: 15, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 236 },
  empty: { opacity: 0.7, marginBottom: 16 },
  docRow: {
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  docRowPressed: { opacity: 0.75 },
  docRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  docRowText: { flex: 1 },
  docType: { fontSize: 15, fontWeight: '500' },
  docMeta: { fontSize: 13, opacity: 0.7, marginTop: 3 },
  docChevron: { fontSize: 20, opacity: 0.4, marginLeft: 8 },
  fuelBtn: {
    position: 'absolute',
    bottom: 192,
    left: 20,
    right: 20,
    borderWidth: 1,
    borderColor: primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fuelBtnText: { color: primary, fontSize: 16, fontWeight: '500' },
  vignetaBtn: {
    position: 'absolute',
    bottom: 136,
    left: 20,
    right: 20,
    borderWidth: 1,
    borderColor: primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  vignetaBtnPressed: { opacity: 0.7 },
  vignetaBtnText: { color: primary, fontSize: 16, fontWeight: '500' },
  deleteBtn: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    borderWidth: 1,
    borderColor: '#c00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#c00', fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  modalLabel: { fontSize: 14, marginBottom: 6, opacity: 0.9 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, opacity: 0.8 },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonPressed: { opacity: 0.85 },
});
