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
