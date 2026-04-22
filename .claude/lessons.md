# Lessons learned

_Adaugă lecții după corecții: cauză + regulă._

## 2026-04-22 – iOS linker/pcm errors după version bump sau update Xcode

**Simptome:**
- `Undefined symbols for architecture arm64: facebook::react::Sealable::Sealable()` referenced from `libExpoModulesCore.a`
- `Module file 'UIKit-XXXXX.pcm' not found: module file not found`
- Alte erori tip „missing framework" sau mismatch între React-Fabric și ExpoModulesCore

**Cauză:** DerivedData + ios/Pods + ios/build conțin obiecte compilate împotriva unor headere React Native / SDK iOS vechi. Un `Clean Build Folder` din Xcode (⇧⌘K) NU curăță ModuleCache.noindex și nici Pods. Podfile.lock ↔ Pods/Manifest.lock pot fi în sync și totuși obiectele compilate să fie stale.

**Fix complet (ordinea contează):**

```bash
# 1. Oprește Xcode complet (nu doar close workspace)
osascript -e 'quit app "Xcode"'

# 2. Șterge toate cache-urile native
rm -rf ~/Library/Developer/Xcode/DerivedData/Dosar-*
rm -rf /Users/ax/work/documents/app/ios/build
rm -rf /Users/ax/work/documents/app/ios/Pods

# 3. Reinstalare Pods (păstrează Podfile.lock → versiuni pinned)
cd /Users/ax/work/documents/app/ios && pod install

# 4. Rebuild
cd /Users/ax/work/documents/app && npm run ios
```

**De ce NU merge doar Clean Build Folder în Xcode:**
- Clean Build Folder atinge doar `Products` și `Intermediates`, nu `ModuleCache.noindex` unde stau `.pcm`.
- `ios/Pods/` rămâne intact și referințele sale pot fi stale față de React prebuilts.

**Variante mai puțin agresive (încearcă în ordine dacă vrei să eviți rebuild 10 min):**
1. Doar `rm -rf ~/Library/Developer/Xcode/DerivedData/Dosar-*` + Clean Build Folder în Xcode.
2. Dacă nu merge: adaugă `rm -rf ios/Pods && cd ios && pod install`.
3. Dacă tot nu merge: ștergi și `ios/Podfile.lock` apoi `pod install --repo-update` (ultim resort — upgrade de versiuni).

**Regulă:**
- După version bump pe app.json/Info.plist → NU e nevoie de cleanup, doar rebuild.
- După `expo prebuild --clean`, upgrade Xcode, upgrade Expo SDK, sau modificări în Podfile → full cleanup ca mai sus.
- Dacă Xcode dă „module X.pcm not found" → full cleanup imediat, nu pierde timp căutând.

## 2026-03-23 – expo prebuild --clean + iOS deployment target

**Problemă:** `npm run prebuild` eșua cu `CocoaPods could not find compatible versions for pod "RNMLKitTextRecognition"` (cere iOS ≥ 15.5, default prebuild este 15.1).

**Cauză:** `expo prebuild --clean` regenerează `Podfile.properties.json` cu default `15.1`, rulează `pod install` intern (care eșuează), iar scriptul `postprebuild` care patchează la 16.0 vine prea târziu.

**Fix aplicat:** Instalat `expo-build-properties` (~55.0.10) și configurat în `app.json` plugins:
```json
["expo-build-properties", { "ios": { "deploymentTarget": "16.0" } }]
```
Plugin-ul setează `ios.deploymentTarget` în `Podfile.properties.json` **înainte** de `pod install`. Scriptul `postprebuild` a fost eliminat din `package.json`.

**Regulă:** Orice setare care trebuie să existe înaintea `pod install` → folosește `expo-build-properties` plugin, nu `postprebuild` npm script.

## 2026-03-15 – TypeScript

**Problemă:** Export `ALL_STANDARD_DOC_TYPES` creat cu `Object.keys({} as Record<...>)` — returnează array gol în loc de lista completă.
**Cauză:** Pattern incorect de a extrage cheile dintr-un tip TypeScript la runtime; tipurile nu există la runtime.
**Regulă:** Pentru a lista toate valorile unui union type, declară explicit un array constant (ex: `STANDARD_DOC_TYPES: DocumentType[] = ['buletin', 'pasaport', ...]`). Nu folosi `Object.keys()` pe un tip TypeScript.
**Aplicabil în:** `types/index.ts`, orice loc unde se încearcă iterarea unui union type

---

## 2026-03-15 – Architecture

**Problemă:** Hook-urile `useCustomTypes` și `useVisibilitySettings` nu aveau `error` state — eșecurile silențioase nu erau vizibile utilizatorului.
**Cauză:** Pattern incomplet la crearea hook-urilor: s-a adăugat `loading` dar s-a omis `error`.
**Regulă:** Orice hook cu operații async TREBUIE să aibă `error: string | null` state, resetat la `null` la start și setat în `catch`. Template: `{ loading, error, refresh, ...data }`.
**Aplicabil în:** Toate fișierele din `hooks/`

---

## 2026-03-15 – Security

**Problemă:** Cheia API Mistral stocată ca `EXPO_PUBLIC_MISTRAL_API_KEY` — variabilele `EXPO_PUBLIC_*` sunt bundle-uite în aplicație și vizibile oricui dezasamblează APK/IPA.
**Cauză:** Confuzie între variabile de build (sigure) și variabile runtime expuse în bundle.
**Regulă:** Nicio cheie API externă (Mistral, OpenAI, etc.) NU se pune în `EXPO_PUBLIC_*`. Alternativa corectă: proxy server propriu, sau user introduce cheia manual în setările aplicației (stocată în SecureStore).
**Aplicabil în:** `services/chatbot.ts`, orice serviciu care apelează API extern

---

## 2026-03-15 – SQLite

**Problemă:** Schema SQLite inițială fără indexuri pe coloanele frecvent filtrate (expiry_date, person_id, vehicle_id, etc.) — queries lente pe date mari.
**Cauză:** La MVP, datele sunt puține și problema nu e vizibilă; indexurile se uită.
**Regulă:** La crearea oricărei tabele noi cu coloane de filtrare/sortare frecventă, adaugă imediat `CREATE INDEX IF NOT EXISTS`. Coloane care necesită index: foreign keys (person_id, vehicle_id, etc.), date de expirare, orice coloană în WHERE.
**Aplicabil în:** `services/db.ts`, orice migrare nouă

---

## 2026-03-15 – Architecture (visibility propagation)

**Problemă:** `visibleDocTypes` aplicat parțial — în `add.tsx` și `expirari.tsx`, dar omis în `documente/index.tsx` (chip filtrare) și `documente/[id].tsx` (edit modal). Tipurile dezactivate apăreau în acele ecrane.
**Cauză:** Fiecare ecran construia propria listă din `DOCUMENT_TYPE_LABELS` direct, fără sursă unică de adevăr.
**Regulă:** Creează hook dedicat (`useFilteredDocTypes`) ca sursă unică. **Niciodată** nu construi liste selectabile de tipuri din `DOCUMENT_TYPE_LABELS` direct — mereu prin `useFilteredDocTypes()`. La orice feature nou cu picker de tipuri, verifică dacă folosește hook-ul.
**Aplicabil în:** Orice screen cu picker/chip list de tipuri de documente

---

## 2026-04-20 – Navigation (React Native / Expo Router)

**Problemă:** `router.push` apelat din callback-ul `onPress` al unui `Alert` pe iOS cauzează ecran alb la revenirea pe ecranul anterior.
**Cauză:** Navigarea pornește în timp ce animația de dismiss a Alert-ului încă rulează. iOS capturează un snapshot al ecranului în mijlocul tranziției → ecran alb/gol.
**Regulă:** Orice navigare declanșată din `Alert.alert` `onPress` → împacheteaz-o în `InteractionManager.runAfterInteractions(() => router.push(...))`. Niciodată `router.push` direct în callback Alert.
**Aplicabil în:** Orice loc unde Alert + navigare sunt combinate.

---

## 2026-04-20 – Image rerender după navigare (React Native)

**Problemă:** `<Image source={{ uri: 'file://...' }}>` apare alb când ecranul revine în focus după `router.push` → Back.
**Cauză:** React Native pe iOS refolosește render-ul vechi al componentei `Image` fără a reîncărca sursa locală. Componenta nu se demontează/remontează la revenirea din navigare.
**Regulă:** Pentru orice ecran care afișează imagini locale și poate fi navigat away + back: adaugă `useFocusEffect` care incrementează un `refreshKey` state. Pasează `refreshKey` la componenta de imagini și include-l în `key`-ul wrapper-ului `View` (`key={id + '_' + refreshKey}`). Asta forțează remontarea `Image` la fiecare revenire.
**Aplicabil în:** Orice componentă cu `<Image source={{ uri: localPath }}>` pe ecrane cu navigare push/pop.

---

## 2026-04-20 – Checklist modificări în fișiere mari (add.tsx, etc.)

**Problemă recurentă:** La modificări în fișiere mari (ex: `add.tsx`), state/props/funcții șterse rămân referențiate în altă parte, sau props noi adăugate nu sunt pasate peste tot.
**Regulă – checklist după orice modificare semnificativă:**
1. State șters → caută toate referințele lui cu grep (inclusiv în JSX și în alte componente)
2. Prop nou adăugat la o componentă → verifică toate locurile unde componenta e folosită
3. Funcție redenumită/ștearsă → grep pentru vechiul nume
4. Import adăugat → verifică că nu era deja importat (duplicate import)
5. Import șters → verifică că nu mai e folosit nicăieri în fișier
**Aplicabil în:** Orice fișier cu >500 linii sau cu >3 locuri de utilizare a componentelor sale.
