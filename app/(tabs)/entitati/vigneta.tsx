import { StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { Text, View } from '@/components/Themed';
import { primary } from '@/theme/colors';
import { useEntities } from '@/hooks/useEntities';
import { VIGNETA_COUNTRIES } from '@/services/vigneta';
import type { VignetaCountry } from '@/services/vigneta';

const REQUIRED_BG = '#f0f7e8';
const REQUIRED_BORDER = '#9EB567';
const OPTIONAL_BORDER = '#e0e0e0';

export default function VignetaScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const { colors } = useTheme();
  const { vehicles } = useEntities();

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const vehicleName = vehicle?.name ?? 'vehicul';

  const required = VIGNETA_COUNTRIES.filter((c) => c.required);
  const optional = VIGNETA_COUNTRIES.filter((c) => !c.required);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>
        Verifică dacă ai nevoie de vignetă pentru{' '}
        <Text style={styles.vehicleName}>{vehicleName}</Text>
      </Text>

      <Text style={styles.sectionTitle}>Vignetă obligatorie</Text>
      {required.map((country) => (
        <CountryCard key={country.code} country={country} />
      ))}

      <Text style={[styles.sectionTitle, styles.sectionTitleOptional]}>
        Fără vignetă / alte taxe
      </Text>
      {optional.map((country) => (
        <CountryCard key={country.code} country={country} />
      ))}
    </ScrollView>
  );
}

function CountryCard({ country }: { country: VignetaCountry }) {
  const { colors } = useTheme();

  if (country.required) {
    return (
      <View style={[styles.card, styles.cardRequired, { backgroundColor: REQUIRED_BG }]}>
        <View style={[styles.cardHeader, { backgroundColor: 'transparent' }]}>
          <Text style={styles.countryName}>{country.name}</Text>
          <View style={styles.badgeRequired}>
            <Text style={styles.badgeRequiredText}>NECESAR</Text>
          </View>
        </View>
        {country.validityOptions.length > 0 && (
          <View style={[styles.validityRow, { backgroundColor: 'transparent' }]}>
            <Text style={styles.validityLabel}>Valabilitate: </Text>
            <Text style={styles.validityOptions}>
              {country.validityOptions.join(' · ')}
            </Text>
          </View>
        )}
        {country.note ? (
          <Text style={styles.note}>{country.note}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        styles.cardOptional,
        { backgroundColor: colors.card, borderColor: OPTIONAL_BORDER },
      ]}>
      <View style={[styles.cardHeader, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.countryName, styles.countryNameOptional]}>{country.name}</Text>
        <View style={styles.badgeOptional}>
          <Text style={styles.badgeOptionalText}>NU</Text>
        </View>
      </View>
      {country.note ? (
        <Text style={[styles.note, styles.noteOptional]}>{country.note}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: {
    fontSize: 15,
    opacity: 0.75,
    marginBottom: 24,
    lineHeight: 22,
  },
  vehicleName: {
    fontWeight: '700',
    opacity: 1,
    color: primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: primary,
  },
  sectionTitleOptional: {
    marginTop: 24,
    opacity: 0.6,
    color: undefined,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardRequired: {
    borderColor: REQUIRED_BORDER,
    shadowColor: '#9EB567',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cardOptional: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  countryNameOptional: {
    opacity: 0.7,
  },
  badgeRequired: {
    backgroundColor: primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeRequiredText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeOptional: {
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOptionalText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  validityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  validityLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  validityOptions: {
    fontSize: 13,
    fontWeight: '500',
    color: primary,
    flexShrink: 1,
  },
  note: {
    fontSize: 12,
    opacity: 0.65,
    marginTop: 6,
    fontStyle: 'italic',
  },
  noteOptional: {
    marginTop: 4,
  },
});
