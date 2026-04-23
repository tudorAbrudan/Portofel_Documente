# Simplify AI Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Înlocuiește opțiunile separate `mistral | openai | custom` cu un singur tip `external`, integrează acordul de utilizare AI contextual în modal-ul de configurare (Settings și Onboarding), și actualizează textele legale să fie generice.

**Architecture:** Tipul `AiProviderType` pierde `mistral`, `openai`, `custom` și capătă `external`. Migrarea e transparentă: `getAiConfig()` mapează valorile vechi la `external`. Acordul (`ai_assistant_consent_accepted`) este salvat/șters direct din `handleSaveAiConfig` și din `handleFinish` (onboarding), nu dintr-un rând separat. Consimțământul e cerut inline în UI când se selectează `builtin` sau `external`.

**Tech Stack:** React Native + Expo (TypeScript), AsyncStorage, expo-secure-store, Expo Router

---

## Fișiere modificate

| Fișier | Modificare |
|--------|-----------|
| `services/aiProvider.ts` | Tip nou `external`, șterge `mistral/openai/custom`, migrare în `getAiConfig()` |
| `app/(tabs)/setari.tsx` | Modal AI simplificat (4 opțiuni), acord inline, șterge rândul separat de consimțământ |
| `components/OnboardingWizard.tsx` | Pasul AI cu 4 opțiuni, câmpuri `external` inline, acord inline, blochează Next |
| `app/(tabs)/chat.tsx` | Text generic în `ConsentModal` (nu mai zice "Mistral AI") |

---

## Task 1: Actualizează `services/aiProvider.ts` — tip `external`

**Files:**
- Modify: `services/aiProvider.ts`

- [ ] **Step 1: Înlocuiește tipul `AiProviderType`**

Schimbă linia 33 din `aiProvider.ts`:

```typescript
// ÎNAINTE:
export type AiProviderType = 'none' | 'builtin' | 'mistral' | 'openai' | 'custom' | 'local';

// DUPĂ:
export type AiProviderType = 'none' | 'builtin' | 'external' | 'local';
```

- [ ] **Step 2: Actualizează `PROVIDER_DEFAULTS`**

Înlocuiește întreg obiectul `PROVIDER_DEFAULTS` (liniile 50–84):

```typescript
export const PROVIDER_DEFAULTS: Record<
  AiProviderType,
  { url: string; model: string; label: string }
> = {
  builtin: {
    url: BUILTIN_URL,
    model: BUILTIN_MODEL,
    label: 'Dosar AI',
  },
  external: {
    url: '',
    model: '',
    label: 'Cheie API proprie',
  },
  none: {
    url: '',
    model: '',
    label: 'Fără AI',
  },
  local: {
    url: '',
    model: '',
    label: 'Model local',
  },
};
```

- [ ] **Step 3: Adaugă migrare în `getAiConfig()`**

Înlocuiește funcția `getAiConfig()` (liniile 95–112):

```typescript
export async function getAiConfig(): Promise<AiProviderConfig> {
  const [typeRaw, urlRaw, modelRaw, apiKey] = await Promise.all([
    AsyncStorage.getItem(KEY_PROVIDER_TYPE),
    AsyncStorage.getItem(KEY_PROVIDER_URL),
    AsyncStorage.getItem(KEY_PROVIDER_MODEL),
    getAiApiKey(),
  ]);

  // Migrare valori vechi → external
  const legacyMap: Record<string, AiProviderType> = {
    mistral: 'external',
    openai: 'external',
    custom: 'external',
  };
  const rawType = typeRaw ?? 'builtin';
  const type: AiProviderType =
    (legacyMap[rawType] as AiProviderType | undefined) ??
    (['none', 'builtin', 'external', 'local'].includes(rawType)
      ? (rawType as AiProviderType)
      : 'builtin');

  const defaults = PROVIDER_DEFAULTS[type];

  return {
    type,
    url: urlRaw ?? defaults.url,
    model: modelRaw ?? defaults.model,
    apiKey,
  };
}
```

- [ ] **Step 4: Verifică TypeScript**

```bash
cd /Users/ax/work/documents/app && npm run type-check 2>&1 | head -40
```

Erori așteptate: vor apărea erori în `setari.tsx` și `OnboardingWizard.tsx` pentru că folosesc tipurile vechi — acestea se rezolvă în task-urile următoare.

- [ ] **Step 5: Commit**

```bash
cd /Users/ax/work/documents/app && git add services/aiProvider.ts
git commit -m "refactor(ai): replace mistral/openai/custom provider types with single external type"
```

---

## Task 2: Actualizează `app/(tabs)/setari.tsx` — modal AI simplificat + acord inline

**Files:**
- Modify: `app/(tabs)/setari.tsx`

> **Context:** Modalul de configurare AI (liniile ~1196–1534) are radio buttons pentru `none|builtin|mistral|openai|custom` + câmpuri separate pentru URL/cheie/model. Rândul "Consimțământ asistent AI" (liniile ~874–893) este separat în card-ul principal.

- [ ] **Step 1: Adaugă state pentru acord în modal**

Găsește blocul de state AI (după linia 255) și adaugă state-ul pentru acord în modal:

```typescript
// Adaugă după linia: const [aiTestMessage, setAiTestMessage] = useState('');
const [aiModalConsentChecked, setAiModalConsentChecked] = useState(false);
```

- [ ] **Step 2: Inițializează `aiModalConsentChecked` la deschiderea modalului**

Găsește `onPress={() => setAiModalVisible(true)}` (rândul InfoRow "Provider AI", ~linia 871) și înlocuiește cu:

```typescript
onPress={() => {
  setAiModalConsentChecked(aiConsentGiven);
  setAiModalVisible(true);
}}
```

- [ ] **Step 3: Actualizează `handleAiProviderSelect` să reseteze acordul când se trece pe local/none**

Găsește funcția `handleAiProviderSelect` (~linia 428) și înlocuiește-o:

```typescript
const handleAiProviderSelect = async (type: AiProviderType) => {
  if (aiProviderType === 'local' && type !== 'local') {
    await localModel.disposeLocalModel().catch(() => {});
  }
  setAiProviderType(type);
  const defaults = aiProvider.PROVIDER_DEFAULTS[type];
  setAiProviderUrl(defaults.url);
  setAiProviderModel(defaults.model);
  setAiTestStatus('idle');
  // Dacă trece pe local/none, debifează acordul
  if (type === 'local' || type === 'none') {
    setAiModalConsentChecked(false);
  }
};
```

- [ ] **Step 4: Actualizează `handleSaveAiConfig` să salveze/șteargă acordul**

Înlocuiește `handleSaveAiConfig` (~linia 540):

```typescript
const handleSaveAiConfig = async () => {
  try {
    const isRemote = aiProviderType === 'builtin' || aiProviderType === 'external';
    if (isRemote && !aiModalConsentChecked) {
      Alert.alert('Acord necesar', 'Bifează acordul de utilizare AI pentru a continua.');
      return;
    }
    await aiProvider.saveAiConfig({
      type: aiProviderType,
      url: aiProviderUrl,
      model: aiProviderModel,
    });
    await aiProvider.saveAiApiKey(aiApiKey);
    // Salvează sau revocă acordul în funcție de tip
    if (isRemote && aiModalConsentChecked) {
      await AsyncStorage.setItem('ai_assistant_consent_accepted', 'true');
      setAiConsentGiven(true);
    } else if (!isRemote) {
      await AsyncStorage.removeItem('ai_assistant_consent_accepted');
      setAiConsentGiven(false);
    }
    setAiModalVisible(false);
  } catch (e) {
    Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut salva configurația');
  }
};
```

- [ ] **Step 5: Șterge rândul separat "Consimțământ asistent AI" din card-ul principal**

Găsește și șterge blocul (liniile ~874–893):

```tsx
// ȘTERGE tot blocul acesta:
<Pressable style={styles.rowLast} onPress={handleToggleAiConsent}>
  <RNView style={styles.rowLeft}>
    <RNView style={[styles.rowIcon, { backgroundColor: '#EDE7F6' }]}>
      <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4527A0" />
    </RNView>
    <RNView style={styles.rowLabelWrap}>
      <RNText style={[styles.rowLabel, { color: C.text }]}>
        Consimțământ asistent AI
      </RNText>
      <RNText
        style={[styles.rowSub, { color: aiConsentGiven ? '#4CAF50' : C.textSecondary }]}
      >
        {aiConsentGiven
          ? '✓ Acordat – apasă pentru revocare'
          : 'Neacordat – apasă pentru activare'}
      </RNText>
    </RNView>
  </RNView>
  <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
</Pressable>
```

Și schimbă stilul rândului InfoRow "Provider AI" din `styles.row` în `styles.rowSingle` (sau adaugă `rowLast` dacă era ultima linie). De fapt, dacă „Provider AI" devine singurul rând, schimbă stilul la `rowLast`:

Găsește `<InfoRow` cu label "Provider AI" și asigură-te că e cu stil `rowLast` (fără border bottom). Structura cardului devine:
```tsx
<RNView style={[styles.card, { backgroundColor: C.card, shadowColor: C.cardShadow }]}>
  <InfoRow
    icon="sparkles-outline"
    iconBg="#EDE7F6"
    iconColor="#4527A0"
    label="Provider AI"
    sub={aiProvider.PROVIDER_DEFAULTS[aiProviderType].label + (aiConsentGiven && (aiProviderType === 'builtin' || aiProviderType === 'external') ? ' · Acord acordat' : '')}
    onPress={() => {
      setAiModalConsentChecked(aiConsentGiven);
      setAiModalVisible(true);
    }}
    scheme={scheme}
    isLast
  />
</RNView>
```

> Verifică dacă `InfoRow` acceptă prop `isLast` sau echivalent; dacă nu, aplică `style={styles.rowLast}` în alt mod conform cod existent.

- [ ] **Step 6: Actualizează lista de radio buttons în modal**

Găsește linia `{(['none', 'builtin', 'mistral', 'openai', 'custom'] as AiProviderType[]).map(type => (` (~linia 1226) și înlocuiește cu:

```tsx
{(['none', 'builtin', 'external'] as AiProviderType[]).map(type => (
```

- [ ] **Step 7: Actualizează câmpurile URL/cheie/model**

Înlocuiește secțiunea condiționată de câmpuri URL/cheie/model (liniile ~1362–1470) cu:

```tsx
{/* Descriere builtin */}
{aiProviderType === 'builtin' && (
  <RNView
    style={[
      styles.aiInput,
      styles.aiInputReadonly,
      {
        borderColor: C.border,
        backgroundColor: C.background,
        flexDirection: 'column',
        height: 'auto',
        paddingVertical: 12,
      },
    ]}
  >
    <RNText style={[styles.aiInputReadonlyText, { color: C.textSecondary, lineHeight: 20 }]}>
      Utilizează serviciul AI inclus în aplicație. Nu este necesară o cheie API personală.
    </RNText>
  </RNView>
)}

{/* Câmpuri pentru external */}
{aiProviderType === 'external' && (
  <RNView style={{ gap: 12 }}>
    <RNView>
      <RNText style={[styles.aiLabel, { color: C.textSecondary }]}>URL API</RNText>
      <TextInput
        style={[styles.aiInput, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
        value={aiProviderUrl}
        onChangeText={text => { setAiProviderUrl(text); setAiTestStatus('idle'); }}
        placeholder="ex: https://api.mistral.ai/v1"
        placeholderTextColor={C.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
    </RNView>
    <RNView>
      <RNText style={[styles.aiLabel, { color: C.textSecondary }]}>Cheie API</RNText>
      <TextInput
        style={[styles.aiInput, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
        value={aiApiKey}
        onChangeText={text => { setAiApiKey(text); setAiTestStatus('idle'); }}
        placeholder="••••••••••"
        placeholderTextColor={C.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
    </RNView>
    <RNView>
      <RNText style={[styles.aiLabel, { color: C.textSecondary }]}>Model</RNText>
      <TextInput
        style={[styles.aiInput, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
        value={aiProviderModel}
        onChangeText={text => { setAiProviderModel(text); setAiTestStatus('idle'); }}
        placeholder="ex: mistral-small-latest"
        placeholderTextColor={C.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </RNView>
  </RNView>
)}
```

- [ ] **Step 8: Adaugă bannerul de acord inline în modal, înainte de butonul "Testează conexiunea"**

Inserează înainte de `{/* Testare conexiune */}` (~linia 1472):

```tsx
{/* Acord utilizare AI — vizibil doar pentru remote */}
{(aiProviderType === 'builtin' || aiProviderType === 'external') && (
  <Pressable
    style={[
      styles.aiToggleCard,
      {
        backgroundColor: aiModalConsentChecked ? '#F1F8E9' : C.card,
        borderColor: aiModalConsentChecked ? '#9EB567' : C.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      },
    ]}
    onPress={() => setAiModalConsentChecked(v => !v)}
  >
    <RNView
      style={{
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: aiModalConsentChecked ? '#9EB567' : C.border,
        backgroundColor: aiModalConsentChecked ? '#9EB567' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
        flexShrink: 0,
      }}
    >
      {aiModalConsentChecked && (
        <Ionicons name="checkmark" size={14} color="#fff" />
      )}
    </RNView>
    <RNView style={{ flex: 1 }}>
      <RNText style={[styles.aiToggleLabel, { color: C.text, fontSize: 14 }]}>
        Sunt de acord cu trimiterea datelor la un serviciu AI extern
      </RNText>
      <RNText style={[styles.aiToggleSub, { color: C.textSecondary }]}>
        Textul extras, numele entităților și detaliile documentelor sunt trimise pentru procesare. Fotografiile și PIN-ul NU sunt trimise.
      </RNText>
    </RNView>
  </Pressable>
)}
```

- [ ] **Step 9: Șterge funcția `handleToggleAiConsent` (nu mai e folosită)**

Găsește și șterge funcția `handleToggleAiConsent` (~liniile 664–693). Dacă există referințe la `handleToggleAiConsent` în altă parte, șterge-le.

De asemenea șterge funcția `handleRevokeConsent` din secțiunea "Date și confidențialitate" dacă există ca funcție separată. Verifică că butonul "Retragere consimțământ AI" din secțiunea de confidențialitate (~linia ~139 din PRIVACY_TEXT) nu are un handler separat în UI — dacă există un `Pressable` de revocare în UI, actualizează-l să deschidă modalul AI în schimb sau șterge-l dacă e redundant.

- [ ] **Step 10: Verifică TypeScript**

```bash
cd /Users/ax/work/documents/app && npm run type-check 2>&1 | head -40
```

Rezultat așteptat: 0 erori pentru `aiProvider.ts` și `setari.tsx`.

- [ ] **Step 11: Commit**

```bash
cd /Users/ax/work/documents/app && git add app/\(tabs\)/setari.tsx
git commit -m "feat(settings): simplify AI provider to external type, integrate consent inline in modal"
```

---

## Task 3: Actualizează `components/OnboardingWizard.tsx` — pasul AI cu `external` + acord

**Files:**
- Modify: `components/OnboardingWizard.tsx`

> **Context:** Pasul AI (step === AI_STEP, ~linia 597) arată 4 carduri: `builtin`, `mistral`, `local`, `none`. La `mistral` apare un link. Datele sunt salvate în `handleFinish` (~linia 243).

- [ ] **Step 1: Adaugă state pentru câmpurile `external` și acordul inline**

Găsește blocul de state (~linia 156) și adaugă:

```typescript
// Adaugă după: const [aiProviderChoice, setAiProviderChoice] = useState<AiProviderType>('builtin');
const [aiExternalUrl, setAiExternalUrl] = useState('');
const [aiExternalApiKey, setAiExternalApiKey] = useState('');
const [aiExternalModel, setAiExternalModel] = useState('');
const [aiConsentChecked, setAiConsentChecked] = useState(false);
```

- [ ] **Step 2: Actualizează `handleFinish` să salveze datele `external` și acordul**

Găsește în `handleFinish` blocul de salvare AI (~liniile 243–249) și înlocuiește-l:

```typescript
const aiActive = aiProviderChoice !== 'none' && aiProviderChoice !== 'local';
// Salvează acordul: true dacă remote și bifat, false altfel
await AsyncStorage.setItem(AI_CONSENT_KEY, aiActive && aiConsentChecked ? 'true' : 'false');

await aiProvider.saveAiConfig({
  type: aiProviderChoice,
  url: aiProviderChoice === 'external' ? aiExternalUrl : aiProvider.PROVIDER_DEFAULTS[aiProviderChoice]?.url ?? '',
  model: aiProviderChoice === 'external' ? aiExternalModel : aiProvider.PROVIDER_DEFAULTS[aiProviderChoice]?.model ?? '',
});

if (aiProviderChoice === 'external') {
  await aiProvider.saveAiApiKey(aiExternalApiKey);
}
```

- [ ] **Step 3: Blochează Next dacă remote fără acord**

Găsește logica de navigare pentru „Continuare" (butonul Next). Localizează unde se validează dacă se poate merge la pasul următor. Adaugă validarea:

```typescript
// Adaugă o funcție helper:
const canProceedFromAiStep = (): boolean => {
  if (step !== AI_STEP) return true;
  const isRemote = aiProviderChoice === 'builtin' || aiProviderChoice === 'external';
  if (isRemote && !aiConsentChecked) return false;
  if (aiProviderChoice === 'external' && (!aiExternalUrl.trim() || !aiExternalApiKey.trim() || !aiExternalModel.trim())) return false;
  return true;
};
```

Aplică această funcție pe butonul „Continuare": setează `disabled={!canProceedFromAiStep()}` și opacitate redusă când e disabled.

> Notă: câmpurile `external` sunt obligatorii (URL + cheie + model) pentru a putea continua — dacă userul nu completează, nu poate merge mai departe. Dacă vrei să permiți salvarea fără cheia completată și userul să configureze mai târziu, scoate condiția pentru `external` din `canProceedFromAiStep`, dar ține validarea acordului.

- [ ] **Step 4: Actualizează lista de opțiuni din pasul AI**

Înlocuiește array-ul de opțiuni (~liniile 599–625):

```tsx
{step === AI_STEP && (
  <View style={styles.aiBlock}>
    {(
      [
        {
          type: 'builtin' as AiProviderType,
          title: 'Dosar AI (recomandat)',
          desc: 'Cloud · 20 interogări/zi gratuit · Pornești imediat, fără configurare',
        },
        {
          type: 'external' as AiProviderType,
          title: 'Cheie API proprie',
          desc: 'Cloud · Nelimitat · Orice provider compatibil OpenAI (Mistral, OpenAI etc.)',
        },
        {
          type: 'local' as AiProviderType,
          title: 'Model local',
          desc: 'Pe device · Privat · Nelimitat · Offline · Download 800MB–4GB din Setări',
        },
        {
          type: 'none' as AiProviderType,
          title: 'Fără AI',
          desc: 'Aplicația funcționează complet offline, fără asistent',
        },
      ] as Array<{ type: AiProviderType; title: string; desc: string }>
    ).map(option => (
      <Pressable
        key={option.type}
        style={[
          styles.aiToggleCard,
          {
            backgroundColor: C.card,
            borderColor: aiProviderChoice === option.type ? C.primary : C.border,
          },
        ]}
        onPress={() => {
          setAiProviderChoice(option.type);
          setAiConsentChecked(false);
        }}
      >
        <View style={styles.aiToggleText}>
          <Text style={[styles.aiToggleLabel, { color: C.text }]}>{option.title}</Text>
          <Text style={[styles.aiToggleSub, { color: C.textSecondary }]}>{option.desc}</Text>
        </View>
        <View
          style={[
            styles.aiRadioDot,
            { borderColor: aiProviderChoice === option.type ? C.primary : C.border },
          ]}
        >
          {aiProviderChoice === option.type && (
            <View style={[styles.aiRadioDotInner, { backgroundColor: C.primary }]} />
          )}
        </View>
      </Pressable>
    ))}

    {/* Câmpuri pentru external — apar doar când e selectat */}
    {aiProviderChoice === 'external' && (
      <View style={{ gap: 8, marginTop: 4 }}>
        <TextInput
          style={[styles.aiInput, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
          value={aiExternalUrl}
          onChangeText={setAiExternalUrl}
          placeholder="URL API (ex: https://api.mistral.ai/v1)"
          placeholderTextColor={C.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TextInput
          style={[styles.aiInput, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
          value={aiExternalApiKey}
          onChangeText={setAiExternalApiKey}
          placeholder="Cheie API"
          placeholderTextColor={C.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[styles.aiInput, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
          value={aiExternalModel}
          onChangeText={setAiExternalModel}
          placeholder="Model (ex: mistral-small-latest)"
          placeholderTextColor={C.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    )}

    {/* Acord AI — vizibil pentru builtin și external */}
    {(aiProviderChoice === 'builtin' || aiProviderChoice === 'external') && (
      <Pressable
        style={[
          styles.aiToggleCard,
          {
            backgroundColor: aiConsentChecked ? '#F1F8E9' : C.card,
            borderColor: aiConsentChecked ? C.primary : C.border,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          },
        ]}
        onPress={() => setAiConsentChecked(v => !v)}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: aiConsentChecked ? C.primary : C.border,
            backgroundColor: aiConsentChecked ? C.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
            flexShrink: 0,
          }}
        >
          {aiConsentChecked && (
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.aiToggleLabel, { color: C.text, fontSize: 14 }]}>
            Sunt de acord cu trimiterea datelor la un serviciu AI extern
          </Text>
          <Text style={[styles.aiToggleSub, { color: C.textSecondary }]}>
            Textul extras, numele entităților și detaliile documentelor sunt trimise pentru procesare. Fotografiile și PIN-ul NU sunt trimise.
          </Text>
        </View>
      </Pressable>
    )}

    <Pressable
      onPress={() => Linking.openURL('https://dosarapp.ro/#asistent-ai')}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 4 }]}
    >
      <Text style={[styles.link, { color: C.primary }]}>
        Află mai multe despre opțiunile AI →
      </Text>
    </Pressable>
  </View>
)}
```

- [ ] **Step 5: Adaugă stiluri pentru `aiInput` dacă lipsesc în OnboardingWizard**

Verifică dacă `styles.aiInput` există în StyleSheet-ul din `OnboardingWizard.tsx`. Dacă nu există, adaugă:

```typescript
aiInput: {
  borderWidth: 1,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 15,
  height: 46,
},
```

- [ ] **Step 6: Aplică `disabled` pe butonul Next pentru pasul AI**

Găsește butonul „Continuare" / Next și aplică condiția:

```tsx
// Butonul Next — adaugă disabled logic
const isNextDisabled = step === AI_STEP && !canProceedFromAiStep();

// Pe Pressable:
<Pressable
  style={[styles.nextBtn, isNextDisabled && { opacity: 0.45 }]}
  onPress={isNextDisabled ? undefined : handleNext}
  disabled={isNextDisabled}
>
```

- [ ] **Step 7: Actualizează summary-ul (pasul final)**

Găsește linia cu `Asistent AI:` din summary (~linia 699):

```tsx
// ÎNAINTE:
{aiProvider.PROVIDER_DEFAULTS[aiProviderChoice]?.label ?? aiProviderChoice}

// DUPĂ: (păstrează la fel — label-ul e deja corect din PROVIDER_DEFAULTS)
{aiProvider.PROVIDER_DEFAULTS[aiProviderChoice]?.label ?? aiProviderChoice}
```

Nu trebuie schimbat nimic dacă `PROVIDER_DEFAULTS['external'].label === 'Cheie API proprie'`.

- [ ] **Step 8: Verifică TypeScript**

```bash
cd /Users/ax/work/documents/app && npm run type-check 2>&1 | head -40
```

Rezultat așteptat: 0 erori.

- [ ] **Step 9: Commit**

```bash
cd /Users/ax/work/documents/app && git add components/OnboardingWizard.tsx
git commit -m "feat(onboarding): simplify AI step to external type, add inline consent checkbox"
```

---

## Task 4: Actualizează textul din `ConsentModal` în `chat.tsx` — generic

**Files:**
- Modify: `app/(tabs)/chat.tsx`

> **Context:** `ConsentModal` (~linia 309) menționează explicit "Mistral AI" de 3 ori. Trebuie generalizat.

- [ ] **Step 1: Actualizează textul `ConsentModal`**

Înlocuiește corpul `ConsentModal` (liniile ~319–344) cu text generic:

```tsx
<Text style={[styles.consentTitle, { color: colors.text }]}>
  Asistent AI – Informații despre confidențialitate
</Text>
<Text style={[styles.consentBody, { color: colors.text }]}>
  Pentru a răspunde la întrebările tale, asistentul trimite date din aplicație
  către{' '}
  <Text style={{ fontWeight: '700' }}>serviciul AI configurat</Text> (cloud extern).
</Text>
<Text style={[styles.consentBody, { color: colors.text }]}>
  <Text style={{ fontWeight: '700' }}>Ce date sunt trimise:</Text> numele entităților
  (persoane, vehicule, proprietăți, carduri, animale), tipurile documentelor, datele de
  expirare și emitere, notele atașate documentelor, date de identificare ale documentelor
  (serie acte, CNP, nr. înmatriculare, nr. înregistrare și alte câmpuri completate).
</Text>
<Text style={[styles.consentBody, { color: colors.text }]}>
  <Text style={{ fontWeight: '700' }}>Ce NU este trimis:</Text> fotografiile documentelor,
  numărul CVV, PIN-ul aplicației.
</Text>
<Text style={[styles.consentNote, { color: colors.textSecondary }]}>
  Datele sunt procesate de providerul AI ales conform propriei politici de confidențialitate.
  Consimțământul poate fi revocat oricând reconfigurând providerul din Setări.
  Dacă nu dorești să partajezi aceste date, apasă „Nu accept".
</Text>
```

- [ ] **Step 2: Verifică TypeScript + lint**

```bash
cd /Users/ax/work/documents/app && npm run type-check 2>&1 | head -20 && npm run lint 2>&1 | head -20
```

Rezultat așteptat: 0 erori.

- [ ] **Step 3: Commit**

```bash
cd /Users/ax/work/documents/app && git add app/\(tabs\)/chat.tsx
git commit -m "fix(chat): update consent modal text to be provider-agnostic"
```

---

## Task 5: Actualizează textele legale din `setari.tsx` — generic

**Files:**
- Modify: `app/(tabs)/setari.tsx`

> **Context:** `TERMS_TEXT` și `PRIVACY_TEXT` (~liniile 78–153) menționează "Mistral AI" și "mistral.ai" explicit. Trebuie generalizate.

- [ ] **Step 1: Actualizează `TERMS_TEXT`**

Găsește linia ~83 (secțiunea ASISTENT AI OPȚIONAL din TERMS_TEXT):

```
// ÎNAINTE:
ASISTENT AI OPȚIONAL: Aplicația include un asistent bazat pe inteligență artificială (Mistral AI – mistral.ai). Dacă alegeți să utilizați această funcție și vă dați acordul explicit în prealabil, anumite date (denumiri entități, tipuri documente, date de expirare și emitere, note, date de identificare ale documentelor) sunt transmise către Mistral AI pentru procesare. Utilizarea asistentului AI este complet opțională; restul aplicației funcționează 100% offline.

// DUPĂ:
ASISTENT AI OPȚIONAL: Aplicația include un asistent bazat pe inteligență artificială. Dacă alegeți să utilizați această funcție și vă dați acordul explicit în prealabil, anumite date (denumiri entități, tipuri documente, date de expirare și emitere, note, date de identificare ale documentelor) sunt transmise către serviciul AI configurat pentru procesare. Utilizarea asistentului AI este complet opțională; restul aplicației funcționează 100% offline.
```

- [ ] **Step 2: Actualizează `PRIVACY_TEXT`**

Găsește secțiunea "3. ASISTENT AI OPȚIONAL – SERVICIU TERȚ" (~liniile 118–131):

```
// ÎNAINTE (secțiunea completă):
3. ASISTENT AI OPȚIONAL – SERVICIU TERȚ
Dacă alegeți să utilizați funcția de asistent AI (chat sau scanare OCR), după acordul dumneavoastră explicit, anumite date sunt transmise către Mistral AI (mistral.ai), un serviciu terț de inteligență artificială:
• Cu propria cheie API (gratuită de pe mistral.ai), puteți controla exact ce provider procesează datele
• Transmiterea are loc EXCLUSIV cu consimțământul explicit acordat anterior
• Politica de confidențialitate Mistral AI: https://mistral.ai/terms

// DUPĂ:
3. ASISTENT AI OPȚIONAL – SERVICIU TERȚ
Dacă alegeți să utilizați funcția de asistent AI (chat sau scanare OCR), după acordul dumneavoastră explicit, anumite date sunt transmise către serviciul AI configurat (cloud extern):
• Puteți configura propriul provider AI (URL + cheie API) din Setări → Asistent AI
• Transmiterea are loc EXCLUSIV cu consimțământul explicit acordat anterior
• Consultați politica de confidențialitate a providerului AI ales
```

Actualizează și linia ~128:

```
// ÎNAINTE:
Procesăm datele în baza consimțământului dumneavoastră explicit (art. 6 alin. 1 lit. a GDPR), dat prin instalarea și utilizarea aplicației. Pentru asistentul AI, consimțământul este solicitat separat și explicit.

// DUPĂ (păstrează sau actualizează ușor):
Procesăm datele în baza consimțământului dumneavoastră explicit (art. 6 alin. 1 lit. a GDPR). Pentru asistentul AI, consimțământul este solicitat explicit la configurare.
```

Actualizează linia ~131 (retenție date AI):

```
// ÎNAINTE:
Datele transmise asistentului AI sunt procesate de Mistral AI conform propriei lor politici de retenție.

// DUPĂ:
Datele transmise asistentului AI sunt procesate de providerul AI ales conform propriei politici de retenție.
```

Actualizează linia ~139 (retragere consimțământ):

```
// ÎNAINTE:
• Retragerea consimțământului AI – Setări → Date și confidențialitate → Revocare consimțământ AI

// DUPĂ:
• Reconfigurare / dezactivare asistent AI – Setări → Asistent AI
```

- [ ] **Step 3: Verifică TypeScript + lint**

```bash
cd /Users/ax/work/documents/app && npm run type-check 2>&1 | head -20 && npm run lint 2>&1 | head -20
```

- [ ] **Step 4: Commit final**

```bash
cd /Users/ax/work/documents/app && git add app/\(tabs\)/setari.tsx
git commit -m "fix(legal): generalize AI provider references in terms and privacy policy texts"
```

---

## Self-Review

### Spec coverage

| Cerință | Task |
|---------|------|
| Unificare `mistral/openai/custom` → `external` | Task 1 |
| Migrare transparentă valori vechi din storage | Task 1 (Step 3) |
| Settings modal: 4 opțiuni, câmpuri URL+cheie+model | Task 2 |
| Acord inline în Settings (nu rând separat) | Task 2 (Steps 5, 8) |
| Onboarding: aceleași 4 opțiuni | Task 3 |
| Onboarding: câmpuri `external` inline | Task 3 (Step 4) |
| Onboarding: acord inline + blochează Next | Task 3 (Steps 3, 4, 6) |
| Chat ConsentModal: text generic | Task 4 |
| Texte legale generice | Task 5 |

### Potențiale probleme

- `InfoRow` din `setari.tsx` — verifică dacă are prop `isLast` sau dacă stilul trebuie aplicat altfel
- `styles.aiInput` în `OnboardingWizard.tsx` — poate lipsi, adaugă-l (Step 5)
- Rândul "Revocare consimțământ AI" din secțiunea "Date și confidențialitate" din setari.tsx — dacă există un Pressable separat în UI (nu doar în PRIVACY_TEXT), șterge-l în Task 2 Step 9
- Butonul Next în OnboardingWizard — localizează exact cum se numește și dacă e `disabled` sau `onPress={undefined}` pentru blocare
