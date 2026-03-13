# Plan Feature – /plan-feature [feature-name]

Planifică implementarea unui feature din PLAN.md sau a unuia nou.

## Pași

### 1. Înțelege cerința
Citește din `PLAN.md` task-ul relevant și `docs/DESIGN_SYSTEM.md`.

### 2. Citește starea curentă
Fișiere relevante: `types/index.ts`, `services/db.ts`, ecranele afectate, hooks existente.

### 3. Analizează impactul
- Ce tabele SQLite se modifică/adaugă?
- Ce ecrane sunt afectate sau noi?
- Ce componente sunt reutilizabile vs. de creat?
- Ce hooks/servicii noi sunt necesare?
- Ce dependențe există între pași?

### 4. Prezintă planul
Format:
```
## Plan: [Feature Name]

### Fișiere de modificat
- `types/index.ts` – adaugă interfața X
- `services/db.ts` – adaugă tabela Y
- `hooks/useX.ts` – creare nou
- `app/(tabs)/x.tsx` – ecran principal

### Ordine implementare
1. Types → 2. DB → 3. Service → 4. Hook → 5. Screen → 6. QC

### Dependențe
- Pasul 3 depinde de 1 și 2
- Pasul 5 depinde de 4

### Riscuri
- Migrare date existente în SQLite
- Compatibilitate iOS/Android
```

### 5. Așteaptă confirmarea utilizatorului înainte de implementare.
