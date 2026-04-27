# Backup & restore

## Arhitectură
- **Format backup:** JSON cu toate entitățile (persons, properties, vehicles, cards, documents) + referințe la fișiere.
- **Fișiere:** copiate din DocumentsDirectory în arhiva de backup.
- **Trigger:** manual din Setări → Backup.
- **Destinație iOS:** iCloud Drive via `expo-sharing` → Files app.
- **Destinație Android:** Google Drive (Faza 2) sau download local.

## Implementare
- Serviciu: `services/backup.ts`.
- Ecran: `app/(tabs)/setari.tsx` – secțiunea Backup & Restore.
- Restaurare: picker fișier `.json` → import entități + copiere fișiere.

## Reguli
- Backup include TOATE entitățile și documentele (fără CVV, fără date sensibile din DB).
- Versioning: include `version` și `exported_at` în JSON.
- Restore: validează schema JSON înainte de import; nu suprascrie date existente fără confirmare.
- Nu salva în cloud automat (privacy-first); doar la acțiunea explicită a utilizatorului.

## Cloud backup în iCloud (Faza 2 — implementat)

### Arhitectură folder iCloud

```
iCloud Drive / Dosar /
├── manifest.json                    ← state-ul curent (suprascris)
├── manifest.meta.json               ← { version, hash, uploadedAt, deviceId, encrypted, ... }
├── snapshots/
│   └── manifest_YYYY-MM-DD.json
└── files/
    └── <uuid>.{jpg,pdf}             ← imutabile
```

### Versioning manifest cloud

Manifestul cloud are propriul `version` (separat de versiunea ZIP-urilor manuale, care e la 9). Pornește la 1 și incrementează la modificări incompatibile.

### Regulă critică — schemă DB

Orice modificare de schemă SQLite (tabel/coloană nouă, redenumire, ștergere) trebuie propagată în **TREI locuri**:

1. `services/db.ts` — migrare
2. `services/backup.ts` — `exportBackup()` (ZIP) și `applyManifest()` (folosit de `importBackup` și `cloudSync.restore`)
3. `services/cloudSync.ts` — `buildManifestPayload()` (ce urc) și implicit `applyManifest` la restore

### Servicii cloud

- `services/cloudStorage.ts` — wrapper peste `react-native-cloud-storage`
- `services/cloudSync.ts` — orchestrator (queue, upload manifest, snapshot, restore)
- `services/cloudCrypto.ts` — AES-256-GCM + PBKDF2 (opțional, configurabil)
- `services/manifestHash.ts` — serializare canonică + SHA-256 deduplication

### Edge cases

- iCloud delogat → status "unavailable", auto-backup pe pauză
- Quota plină → eroare clară, banner în Settings
- Offline upload → queue în `pending_uploads`, retry la următoarea acțiune
- Conflict cross-device → last-write-wins, banner pe celălalt device
- Criptare: pierderea parolei = pierderea backup-ului, by design

### Testare manuală obligatorie

iCloud Documents nu funcționează complet pe simulator. Testarea completă necesită device fizic + cont iCloud activ.
