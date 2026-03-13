import { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  View as RNView,
  Text as RNText,
  TextInput,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useEntities } from '@/hooks/useEntities';
import type { EntityType, Person, Property, Vehicle, Card } from '@/types';

type AnyEntity = Person | Property | Vehicle | Card;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { key: EntityType; label: string; icon: IoniconName }[] = [
  { key: 'person', label: 'Persoane', icon: 'person-outline' },
  { key: 'property', label: 'Proprietăți', icon: 'home-outline' },
  { key: 'vehicle', label: 'Vehicule', icon: 'car-outline' },
  { key: 'card', label: 'Carduri', icon: 'card-outline' },
];

const ENTITY_ICON: Record<EntityType, IoniconName> = {
  person: 'person',
  property: 'home',
  vehicle: 'car',
  card: 'card',
};

const ENTITY_ICON_BG: Record<EntityType, string> = {
  person: '#E3F2FD',
  property: '#E8F5E9',
  vehicle: '#FFF3E0',
  card: '#F3E5F5',
};

const ENTITY_ICON_COLOR: Record<EntityType, string> = {
  person: '#1565C0',
  property: '#2E7D32',
  vehicle: '#E65100',
  card: '#7B1FA2',
};

export default function EntitatiListScreen() {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];

  const [tab, setTab] = useState<EntityType>('person');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    persons,
    properties,
    vehicles,
    cards,
    loading,
    error,
    refresh,
    deletePerson,
    deleteProperty,
    deleteVehicle,
    deleteCard,
  } = useEntities();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const rawList: AnyEntity[] = useMemo(
    () =>
      tab === 'person'
        ? persons
        : tab === 'property'
          ? properties
          : tab === 'vehicle'
            ? vehicles
            : cards,
    [tab, persons, properties, vehicles, cards]
  );

  const list: AnyEntity[] = useMemo(() => {
    if (!searchQuery.trim()) return rawList;
    const q = searchQuery.trim().toLowerCase();
    return rawList.filter(
      item =>
        ('name' in item && typeof item.name === 'string' && item.name.toLowerCase().includes(q)) ||
        ('nickname' in item &&
          typeof item.nickname === 'string' &&
          item.nickname.toLowerCase().includes(q))
    );
  }, [rawList, searchQuery]);

  const deleteEntity = (id: string, name: string) => {
    Alert.alert('Ștergere', `Ștergi „${name}"?`, [
      { text: 'Anulare', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          try {
            if (tab === 'person') await deletePerson(id);
            else if (tab === 'property') await deleteProperty(id);
            else if (tab === 'vehicle') await deleteVehicle(id);
            else await deleteCard(id);
            refresh();
          } catch (e) {
            Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut șterge');
          }
        },
      },
    ]);
  };

  const getTitle = (item: AnyEntity): string => {
    if ('name' in item && item.name) return item.name as string;
    if ('nickname' in item && item.nickname) return item.nickname as string;
    return '—';
  };

  const getSubtitle = (item: AnyEntity): string | null => {
    if (tab === 'card' && 'last4' in item && item.last4) return `•••• ${item.last4}`;
    if (tab === 'vehicle' && 'type' in item && item.type) return item.type as string;
    return null;
  };

  const tabCount = rawList.length;
  const subtitleText = `${tabCount} ${tab === 'person' ? 'persoane' : tab === 'property' ? 'proprietăți' : tab === 'vehicle' ? 'vehicule' : 'carduri'}`;

  return (
    <RNView style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Custom Header ── */}
      <RNView style={[styles.header, { backgroundColor: C.background }]}>
        <RNView style={styles.headerLeft}>
          <RNText style={[styles.headerTitle, { color: C.text }]}>Entități</RNText>
          <RNText style={[styles.headerSub, { color: C.textSecondary }]}>{subtitleText}</RNText>
        </RNView>
      </RNView>

      {/* ── Search bar ── */}
      <RNView style={[styles.searchWrap, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="search" size={20} color={C.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Caută entitate..."
          placeholderTextColor={C.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </RNView>

      {/* ── Tabs as chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        style={styles.chipsRow}
      >
        {TABS.map(({ key, label, icon }) => {
          const isActive = tab === key;
          return (
            <Pressable
              key={key}
              style={[
                styles.chip,
                { borderColor: C.border },
                isActive && { backgroundColor: '#9EB567', borderColor: '#9EB567' },
              ]}
              onPress={() => setTab(key)}
            >
              <Ionicons
                name={icon}
                size={13}
                color={isActive ? '#fff' : C.textSecondary}
                style={styles.chipIcon}
              />
              <RNText
                style={[
                  styles.chipText,
                  { color: isActive ? '#fff' : C.text },
                  isActive && styles.chipTextActive,
                ]}
              >
                {label}
              </RNText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Error banner ── */}
      {error ? (
        <RNView style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#E53935" />
          <RNText style={styles.errorText}>{error}</RNText>
        </RNView>
      ) : null}

      {/* ── Entity list ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          list.length === 0 && styles.scrollContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.primary} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!error && list.length === 0 && !loading ? (
          <RNView style={styles.emptyWrap}>
            <Ionicons
              name={ENTITY_ICON[tab]}
              size={64}
              color={C.textSecondary}
              style={styles.emptyIcon}
            />
            <RNText style={[styles.emptyTitle, { color: C.text }]}>
              {searchQuery.trim() ? 'Niciun rezultat' : 'Nicio entitate'}
            </RNText>
            <RNText style={[styles.emptySub, { color: C.textSecondary }]}>
              {searchQuery.trim()
                ? 'Încearcă alte cuvinte cheie.'
                : 'Apasă + Adaugă pentru a crea prima entitate.'}
            </RNText>
          </RNView>
        ) : (
          list.map(item => {
            const title = getTitle(item);
            const subtitle = getSubtitle(item);
            const iconBg = ENTITY_ICON_BG[tab];
            const iconColor = ENTITY_ICON_COLOR[tab];
            const iconName = ENTITY_ICON[tab];
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: C.card, shadowColor: C.cardShadow },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => router.push(`/(tabs)/entitati/${item.id}`)}
                onLongPress={() => deleteEntity(item.id, title)}
                android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: false }}
              >
                {/* Left icon */}
                <RNView style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                  <Ionicons name={iconName} size={22} color={iconColor} />
                </RNView>

                {/* Content */}
                <RNView style={styles.cardContent}>
                  <RNText style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>
                    {title}
                  </RNText>
                  {subtitle && (
                    <RNText
                      style={[styles.cardSub, { color: C.textSecondary }]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </RNText>
                  )}
                </RNView>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/(tabs)/entitati/add')}
        accessibilityLabel="Adaugă entitate"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={24} color="#fff" />
        <RNText style={styles.fabText}>Adaugă</RNText>
      </Pressable>
    </RNView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: { gap: 2 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  headerSub: {
    fontSize: 14,
    lineHeight: 18,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // Chips
  chipsRow: {
    height: 44,
    flexShrink: 0,
  },
  chipsContent: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipIcon: { marginRight: 4 },
  chipText: { fontSize: 13, lineHeight: 18 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginTop: 4,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: { color: '#E53935', fontSize: 13, flex: 1 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 96,
  },
  scrollContentEmpty: { flexGrow: 1 },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { marginBottom: 16, opacity: 0.4 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardSub: {
    fontSize: 12,
    lineHeight: 17,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#9EB567',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
