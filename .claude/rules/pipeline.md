# Pipeline și mediu

## Comenzi de build
- Dev: `npm start` (expo start --clear)
- iOS: `npm run ios` (expo run:ios)
- Android: `npm run android`
- Prebuild: `npm run prebuild` (expo prebuild --clean)

## Calitate cod (înainte de commit)
- `npm run type-check` – TypeScript fără erori
- `npm run lint` – ESLint fără erori
- `npm run format` – Prettier

## Secrets și .env
- App nu are backend → nu există secrets sensibile.
- Nu comite fișiere `.env` dacă există (ex. variabile de build).
- `app.json` – configurare Expo; nu include informații sensibile.

## Structura de foldere
- Nu crea foldere noi fără motiv. Structura curentă: `app/`, `components/`, `hooks/`, `services/`, `types/`, `theme/`, `constants/`, `assets/`.
