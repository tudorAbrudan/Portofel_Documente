import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { SUPPORT_URL } from '@/constants/AppLinks';
import AppLockPinModal from '@/components/AppLockPinModal';
import {
  ALL_ENTITY_TYPES,
  STANDARD_DOC_TYPES,
  ENTITY_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from '@/types';
import type { EntityType, DocumentType } from '@/types';
import * as settings from '@/services/settings';
import {
  requestNotificationPermission,
  scheduleExpirationReminders,
} from '@/services/notifications';
import { primary } from '@/theme/colors';
import { radius, spacing } from '@/theme/layout';

const TOTAL_STEPS = 7;

const WELCOME = 0;
const SECURITY = 1;
const ENTITIES = 2;
const DOCS = 3;
const NOTIFICATIONS = 4;
const BACKUP = 5;
const SUMMARY = 6;

const NOTIF_DAY_OPTIONS = [7, 14, 30] as const;

const ENTITY_LABELS: Record<EntityType, string> = {
  person: 'Persoană',
  vehicle: 'Vehicul',
  property: 'Proprietate',
  card: 'Card',
  animal: 'Animal',
  company: 'Firmă',
};

const ENTITY_ICONS: Record<EntityType, string> = {
  person: '👤',
  vehicle: '🚗',
  property: '🏠',
  card: '💳',
  animal: '🐾',
  company: '🏢',
};

const ENTITY_DESCRIPTIONS: Record<EntityType, string> = {
  person: 'Buletin, pașaport, permis, rețete',
  vehicle: 'Talon, RCA, ITP, CASCO, vignetă',
  property: 'Acte proprietate, facturi, PAD',
  card: 'Carduri bancare, abonamente',
  animal: 'Vaccinuri, deparazitare, vizite vet',
  company: 'Certificat înregistrare, acte constitutive, TVA',
};

interface Props {
  onComplete: () => void;
}

function stepTitle(step: number): string {
  switch (step) {
    case WELCOME:
      return 'Bun venit';
    case SECURITY:
      return 'Securitate';
    case ENTITIES:
      return 'Ce vei gestiona?';
    case DOCS:
      return 'Ce documente te interesează?';
    case NOTIFICATIONS:
      return 'Notificări expirări';
    case BACKUP:
      return 'Backup';
    case SUMMARY:
      return 'Rezumat';
    default:
      return '';
  }
}

function stepSubtitle(step: number): string {
  switch (step) {
    case WELCOME:
      return 'Iată ce trebuie să știi înainte să începi.';
    case SECURITY:
      return 'Câteva recomandări pentru datele tale sensibile.';
    case ENTITIES:
      return 'Alege tipurile de entități pe care le vei folosi. Poți schimba oricând din Setări.';
    case DOCS:
      return 'Am preselectat documentele aferente entităților alese. Ajustează după nevoie.';
    case NOTIFICATIONS:
      return 'Primești remindere locale pe telefon — fără server, fără cont online.';
    case BACKUP:
      return 'Exportul periodic îți protejează datele la schimbare de telefon sau reinstalare.';
    case SUMMARY:
      return 'Verifică setările. Poți modifica totul din Setări oricând.';
    default:
      return '';
  }
}

export default function OnboardingWizard({ onComplete }: Props) {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(WELCOME);
  const [selectedEntities, setSelectedEntities] = useState<EntityType[]>([...ALL_ENTITY_TYPES]);
  const [selectedDocTypes, setSelectedDocTypes] = useState<DocumentType[]>([...STANDARD_DOC_TYPES]);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifDays, setNotifDays] = useState(7);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);

  useEffect(() => {
    settings.getPushEnabled().then(setPushEnabled);
    settings.getNotificationDays().then(d => {
      setNotifDays(d === 7 || d === 14 || d === 30 ? d : 7);
    });
    settings.getAppLockEnabled().then(setLockEnabled);
  }, []);

  function toggleEntity(entityType: EntityType) {
    setSelectedEntities(prev => {
      const isSelected = prev.includes(entityType);
      if (isSelected && prev.length <= 1) return prev;
      return isSelected ? prev.filter(e => e !== entityType) : [...prev, entityType];
    });
  }

  function toggleDocType(docType: DocumentType) {
    setSelectedDocTypes(prev => {
      const isSelected = prev.includes(docType);
      if (isSelected && prev.length <= 1) return prev;
      return isSelected ? prev.filter(d => d !== docType) : [...prev, docType];
    });
  }

  function goNextFromEntities() {
    const recommendedDocs = new Set<DocumentType>();
    selectedEntities.forEach(entity => {
      ENTITY_DOCUMENT_TYPES[entity].forEach(doc => recommendedDocs.add(doc));
    });
    setSelectedDocTypes(Array.from(recommendedDocs));
    setStep(DOCS);
  }

  async function goNextFromNotifications() {
    await settings.setPushEnabled(pushEnabled);
    await settings.setNotificationDays(notifDays);
    if (pushEnabled) {
      await requestNotificationPermission();
    }
    await scheduleExpirationReminders();
    setStep(BACKUP);
  }

  async function handleComplete() {
    await settings.setVisibleEntityTypes(selectedEntities);
    await settings.setVisibleDocTypes(selectedDocTypes);
    await settings.setPushEnabled(pushEnabled);
    await settings.setNotificationDays(notifDays);
    await scheduleExpirationReminders();
    await settings.setOnboardingDone();
    onComplete();
  }

  function handleFooterPrimary() {
    if (step === SUMMARY) {
      void handleComplete();
      return;
    }
    if (step === ENTITIES) {
      goNextFromEntities();
      return;
    }
    if (step === NOTIFICATIONS) {
      void goNextFromNotifications();
      return;
    }
    setStep(s => s + 1);
  }

  function handleBack() {
    if (step > WELCOME) setStep(s => s - 1);
  }

  const relevantDocTypes = STANDARD_DOC_TYPES.filter(doc =>
    selectedEntities.some(entity => ENTITY_DOCUMENT_TYPES[entity].includes(doc))
  );
  const otherDocTypes = STANDARD_DOC_TYPES.filter(doc => !relevantDocTypes.includes(doc));

  const welcomeBullets = [
    'Datele și fișierele stau pe acest dispozitiv (SQLite, local). Nu există cont online obligatoriu.',
    'Poți folosi asistentul AI doar dacă accepți explicit — altfel aplicația funcționează offline.',
    'Exportul de backup (JSON) este opțional și sub controlul tău (Drive, iCloud, Fișiere).',
  ];

  const securityBullets = [
    'Recomandăm Face ID / Touch ID sau PIN pentru a limita accesul la acte și documente.',
    'Nu salva codul CVV al cardurilor sau parole în câmpurile de note.',
    'Fișierele sunt izolate în sandbox-ul sistemului; alte aplicații nu le văd.',
  ];

  return (
    <View style={[styles.overlay, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: C.border }]}>
        <Text style={[styles.stepIndicator, { color: C.textSecondary }]}>
          {step + 1} / {TOTAL_STEPS}
        </Text>
        <Text style={[styles.title, { color: C.text }]}>{stepTitle(step)}</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>{stepSubtitle(step)}</Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
        <View style={{ flex: step + 1, backgroundColor: primary }} />
        <View style={{ flex: Math.max(0, TOTAL_STEPS - step - 1), minWidth: 0 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === WELCOME && (
          <View style={styles.bulletBlock}>
            {welcomeBullets.map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: C.primary }]}>•</Text>
                <Text style={[styles.bulletText, { color: C.text }]}>{line}</Text>
              </View>
            ))}
          </View>
        )}

        {step === SECURITY && (
          <>
            <View style={styles.bulletBlock}>
              {securityBullets.map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: C.primary }]}>•</Text>
                  <Text style={[styles.bulletText, { color: C.text }]}>{line}</Text>
                </View>
              ))}
            </View>
            {Platform.OS === 'web' ? (
              <Text style={[styles.webNote, { color: C.textSecondary }]}>
                Pe web, blocarea cu PIN / biometrie nu este disponibilă.
              </Text>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryCta,
                  { borderColor: C.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => setPinModalVisible(true)}
              >
                <Text style={[styles.secondaryCtaText, { color: C.primary }]}>
                  Activează PIN acum
                </Text>
              </Pressable>
            )}
          </>
        )}

        {step === ENTITIES &&
          ALL_ENTITY_TYPES.map(entityType => {
            const isSelected = selectedEntities.includes(entityType);
            return (
              <Pressable
                key={entityType}
                style={({ pressed }) => [
                  styles.entityCard,
                  {
                    backgroundColor: C.card,
                    shadowColor: C.cardShadow,
                    borderColor: isSelected ? C.primary : 'transparent',
                  },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => toggleEntity(entityType)}
              >
                <View
                  style={[
                    styles.entityIcon,
                    { backgroundColor: isSelected ? C.primaryMuted : C.background },
                  ]}
                >
                  <Text style={styles.entityIconText}>{ENTITY_ICONS[entityType]}</Text>
                </View>
                <View style={styles.entityContent}>
                  <Text style={[styles.entityLabel, { color: C.text }]}>
                    {ENTITY_LABELS[entityType]}
                  </Text>
                  <Text style={[styles.entityDesc, { color: C.textSecondary }]}>
                    {ENTITY_DESCRIPTIONS[entityType]}
                  </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}

        {step === DOCS && (
          <>
            {relevantDocTypes.length > 0 && (
              <>
                <Text style={[styles.groupLabel, { color: C.textSecondary }]}>RECOMANDATE</Text>
                <View style={styles.chipRow}>
                  {relevantDocTypes.map(docType => {
                    const isSelected = selectedDocTypes.includes(docType);
                    return (
                      <Pressable
                        key={docType}
                        style={[
                          styles.chip,
                          isSelected
                            ? [styles.chipActive, { borderColor: C.primary }]
                            : { borderColor: C.border, backgroundColor: C.card },
                        ]}
                        onPress={() => toggleDocType(docType)}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? '#fff' : C.text }]}>
                          {DOCUMENT_TYPE_LABELS[docType]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            {otherDocTypes.length > 0 && (
              <>
                <Text style={[styles.groupLabel, { color: C.textSecondary, marginTop: 16 }]}>
                  ALTELE
                </Text>
                <View style={styles.chipRow}>
                  {otherDocTypes.map(docType => {
                    const isSelected = selectedDocTypes.includes(docType);
                    return (
                      <Pressable
                        key={docType}
                        style={[
                          styles.chip,
                          isSelected
                            ? [styles.chipActive, { borderColor: C.primary }]
                            : { borderColor: C.border, backgroundColor: C.card },
                        ]}
                        onPress={() => toggleDocType(docType)}
                      >
                        <Text style={[styles.chipText, { color: isSelected ? '#fff' : C.text }]}>
                          {DOCUMENT_TYPE_LABELS[docType]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {step === NOTIFICATIONS && (
          <View style={[styles.notifCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.notifRow}>
              <View style={styles.notifRowText}>
                <Text style={[styles.notifLabel, { color: C.text }]}>Remindere expirări</Text>
                <Text style={[styles.notifSub, { color: C.textSecondary }]}>
                  Notificări locale când se apropie data expirării
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: '#ccc', true: primary }}
              />
            </View>
            {pushEnabled && (
              <>
                <Text style={[styles.notifDaysLabel, { color: C.textSecondary }]}>
                  Câte zile înainte să te anunțăm
                </Text>
                <View style={styles.chipRow}>
                  {NOTIF_DAY_OPTIONS.map(d => {
                    const active = notifDays === d;
                    return (
                      <Pressable
                        key={d}
                        style={[
                          styles.chip,
                          active
                            ? [styles.chipActive, { borderColor: C.primary }]
                            : { borderColor: C.border, backgroundColor: C.background },
                        ]}
                        onPress={() => setNotifDays(d)}
                      >
                        <Text style={[styles.chipText, { color: active ? '#fff' : C.text }]}>
                          {d} zile
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {step === BACKUP && (
          <View style={styles.bulletBlock}>
            <Text style={[styles.backupBody, { color: C.text }]}>
              Din Setări poți exporta toate datele într-un fișier JSON și atașamentele într-o
              arhivă. Recomandăm export periodic — la dezinstalare, datele dispar de pe dispozitiv.
            </Text>
            <Pressable
              onPress={() => Linking.openURL(SUPPORT_URL)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: spacing.gap }]}
            >
              <Text style={[styles.link, { color: C.primary }]}>Deschide ghidul și suportul</Text>
            </Pressable>
          </View>
        )}

        {step === SUMMARY && (
          <View style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.summaryLine, { color: C.text }]}>
              <Text style={styles.summaryKey}>Entități: </Text>
              {selectedEntities.map(e => ENTITY_LABELS[e]).join(', ')}
            </Text>
            <Text style={[styles.summaryLine, { color: C.text }]}>
              <Text style={styles.summaryKey}>Tipuri documente vizibile: </Text>
              {selectedDocTypes.length}
            </Text>
            <Text style={[styles.summaryLine, { color: C.text }]}>
              <Text style={styles.summaryKey}>Notificări expirări: </Text>
              {pushEnabled ? `Da (${notifDays} zile înainte)` : 'Nu'}
            </Text>
            <Text style={[styles.summaryLine, { color: C.text }]}>
              <Text style={styles.summaryKey}>Blocare aplicație: </Text>
              {lockEnabled ? 'Activă (PIN / biometrie)' : 'Nu'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            borderTopColor: C.border,
            backgroundColor: C.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
              },
              android: { elevation: 12 },
              default: {},
            }),
          },
        ]}
      >
        {step > WELCOME && (
          <Pressable
            style={({ pressed }) => [
              styles.btnBack,
              { borderColor: C.primary, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={handleBack}
          >
            <Text style={[styles.btnBackText, { color: C.primary }]}>Înapoi</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.btnNext,
            step === WELCOME && styles.btnNextSingle,
            { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleFooterPrimary}
        >
          <Text style={styles.btnNextText}>{step === SUMMARY ? 'Începe' : 'Continuă'}</Text>
        </Pressable>
      </View>

      <AppLockPinModal
        visible={pinModalVisible}
        onDismiss={() => setPinModalVisible(false)}
        showSuccessAlert={false}
        onPinSaved={() => setLockEnabled(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  bulletBlock: { gap: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { fontSize: 18, lineHeight: 22, width: 14 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22 },
  webNote: { marginTop: 16, fontSize: 14, lineHeight: 20 },
  secondaryCta: {
    marginTop: 20,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryCtaText: { fontSize: 15, fontWeight: '600' },

  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  entityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entityIconText: { fontSize: 22 },
  entityContent: { flex: 1 },
  entityLabel: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  entityDesc: { fontSize: 12, lineHeight: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkboxActive: { backgroundColor: primary, borderColor: primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },

  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipActive: { backgroundColor: primary },
  chipText: { fontSize: 13, fontWeight: '500' },

  notifCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notifRowText: { flex: 1 },
  notifLabel: { fontSize: 16, fontWeight: '600' },
  notifSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  notifDaysLabel: { fontSize: 13, marginTop: 16, marginBottom: 10, fontWeight: '500' },

  backupBody: { fontSize: 15, lineHeight: 22 },
  link: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },

  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryLine: { fontSize: 15, lineHeight: 22 },
  summaryKey: { fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btnBack: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnBackText: { fontSize: 16, fontWeight: '600' },
  btnNext: {
    flex: 2,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnNextSingle: { flex: 1 },
  btnNextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
