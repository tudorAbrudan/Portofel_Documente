# Convenții de cod

## TypeScript
- Evita `any`; folosește tipuri din `types/index.ts`.
- Tipuri noi → adaugă în `types/index.ts`.
- Funcții publice din servicii → tip de return explicit.

## React Native / Expo
- Componente funcționale cu hooks.
- Stiluri: `StyleSheet.create` (nu inline styles la scară).
- Navigare: Expo Router (file-based routing în `app/`).
- Text: mereu în `<Text>` sau `<ThemedText>` – niciodată string raw în JSX.

## Structură
- Ecrane → `app/(tabs)/` sau `app/modal.tsx`.
- Componente reutilizabile → `components/`.
- Logica de business → `services/` (db.ts, documents.ts, entities.ts, etc.).
- Custom hooks → `hooks/`.
- Tipuri → `types/index.ts`.
- Design system → `theme/` și `constants/Theme.ts`.

## Naming
- Fișiere: `camelCase.ts` / `PascalCase.tsx` pentru componente.
- Variabile/funcții: `camelCase`.
- Tipuri/Interfețe: `PascalCase`.
- Constante: `UPPER_SNAKE_CASE`.

## Git
- Commit messages în engleză, descriptive.
- Commit-uri mici, pe feature.
- Rulează QC înainte de commit: `npm run type-check && npm run lint`.
