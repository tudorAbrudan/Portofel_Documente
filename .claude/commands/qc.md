# Quality Check – /qc

Rulează verificările de calitate pe codul modificat.

## Pași

### 1. Detectează fișierele modificate
```bash
git diff --name-only HEAD
git diff --name-only --cached
```

### 2. TypeScript type-check
```bash
cd /Users/ax/work/documents/app && npm run type-check
```
Dacă există erori: raportează-le grupat pe fișier.

### 3. ESLint
```bash
cd /Users/ax/work/documents/app && npm run lint
```
Dacă există erori: raportează-le. Încearcă auto-fix cu `npm run lint:fix` dacă sunt fixabile.

### 4. Prettier check
```bash
cd /Users/ax/work/documents/app && npm run format
```

### 5. Raport final
Afișează:
- ✅ TypeScript OK / ❌ N erori
- ✅ ESLint OK / ❌ N erori
- ✅ Prettier OK / ❌ N fișiere reformatate

Nu face commit automat.
