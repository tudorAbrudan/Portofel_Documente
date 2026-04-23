# Design system – EVPoint + #9EB567

## Design ales
- **Kit:** EVPoint (Figma) – EV Charging Station Finder App UI Kit.
- **Primary color:** `#9EB567` (înlocuiește verdele din kit).
- **Design system detaliat:** `docs/DESIGN_SYSTEM.md`.

## Principii
- **Un singur design system** – nu amesteca stiluri ad-hoc cu componente din design system.
- **Consistență:** butoane, carduri, culori, fonturi, spacing identice în toată aplicația.
- **Mobile-first:** iOS first; Android când prinde tracțiune.

## Culori (din `theme/` și `constants/Theme.ts`)
- Primary: `#9EB567`
- Background: conform theme (light/dark)
- Text: conform theme
- Accent/secondary: conform design system

## Theme & dark/light mode – REGULĂ CRITICĂ

**Orice componentă care randează vizual TREBUIE să respecte preferința de temă a utilizatorului** (Setări → Aspect: Auto / Deschis / Întunecat).

### 1. Import `useColorScheme` doar din app-hook

**Întotdeauna:**
```ts
import { useColorScheme } from '@/components/useColorScheme';
```

**Niciodată** (bypass-ează `ThemePreferenceContext`, ignoră setarea utilizatorului):
```ts
import { useColorScheme } from 'react-native'; // ❌ GREȘIT
```

**Singura excepție:** `app/_layout.tsx` (rădăcină), care citește valoarea system-ului ca `useColorSchemeNative` pentru a o combina cu preferința stocată în `ThemePreferenceContext.Provider`. Nicăieri altundeva.

### 2. Folosește paleta, nu culori hardcodate

**Întotdeauna:**
```ts
import { useColorScheme } from '@/components/useColorScheme';
import { light, dark, primary, statusColors } from '@/theme/colors';

const scheme = useColorScheme();
const palette = scheme === 'dark' ? dark : light;

// palette.card, palette.background, palette.surface,
// palette.text, palette.textSecondary, palette.border, palette.cardShadow
```

Sau pentru culori neutre din navigation theme:
```ts
import { useTheme } from '@react-navigation/native';
const { colors } = useTheme(); // colors.text, colors.background, colors.card, colors.border, colors.primary
```

**Interzis în componente** (nu în StyleSheet, nu inline):
- Hex literali: `'#fff'`, `'#000'`, `'#fafafa'`, `'#e0e0e0'`, `'#D84C4C'`, etc.
- `rgb()` / `rgba()` literali
- `'white'`, `'black'`, `'gray'` etc.

Excepții permise (rare):
- `'transparent'`
- `statusColors.ok / warning / critical` (deja din paletă)
- Valori tranzitorii cu alpha calculat din paletă (ex: `${palette.border}80`)

### 3. Checklist pentru code review

Înainte de approve pe orice PR cu modificări UI:
- [ ] `useColorScheme` importat din `@/components/useColorScheme` (nu `react-native`)?
- [ ] Zero `backgroundColor: '#...'`, `color: '#...'`, `borderColor: '#...'` hardcodate în component body sau `StyleSheet.create`?
- [ ] `placeholderTextColor` setat pe `TextInput` (folosind `palette.textSecondary`)?
- [ ] `Switch` are `trackColor` explicit (nu lasă default-ul alb pe dark)?
- [ ] Modaluri / banner-uri / carduri folosesc `palette.card` sau `palette.surface`?

### 4. De ce

`useColorScheme` din `react-native` returnează DOAR schema sistemului iOS/Android. Dacă utilizatorul a forțat "Deschis" în Setări dar telefonul e pe dark, varianta din react-native returnează `'dark'` → UI afișează dark deși userul a cerut light. Preferința e stocată în `ThemePreferenceContext` și e citită corect doar prin `@/components/useColorScheme`.

## Componente
- Folosește componente din `components/` (Themed, AppLockScreen etc.).
- Butoane: stil consistent, dimensiuni standard.
- Carduri: padding, border-radius, shadow conform design system.
- Icons: Expo Vector Icons (Ionicons / MaterialIcons).

## Spacing
- Folosește constante din `theme/` pentru spacing (nu valori magice).
- Grid: 8px base unit.
