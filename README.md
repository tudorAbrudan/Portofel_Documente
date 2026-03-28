# Documente personale – App

Aplicație React Native + Expo (TypeScript) pentru gestionarea documentelor personale (acte, mașini, proprietăți, carduri). Plan: [../PLAN.md](../PLAN.md).

App **local-first**: date în SQLite pe device, fișiere locale, backup în iCloud/Google Drive. Fără backend, fără login online.

## Pornire

```bash
cd app
npm install
npm start          # expo start --clear
```

- **iOS:** `npm run ios` sau scan QR în Expo Go
- **Android:** `npm run android` sau scan QR

## Calitate cod

```bash
npm run type-check    # TypeScript
npm run lint          # ESLint
npm run format        # Prettier
```

## Structură

- `app/` – rute Expo Router (tabs: Acasă, Entități, Documente, Expirări, Setări)
- `components/` – componente UI reutilizabile
- `theme/` – design system (Mindify-inspired sage + `theme/layout`)
- `constants/` – culori, temă navigare
- `services/` – SQLite (db.ts), entități, documente, backup, notificări
- `hooks/` – useDocuments, useEntities, useAppLock
- `types/` – tipuri TypeScript

## Design

Design system: [../docs/DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md). Primary: `#A3B86C`.
