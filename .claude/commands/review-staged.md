# Review Staged – /review-staged

Analizează fișierele staged cu agentul `code-reviewer` înainte de commit.

## Pași

### 1. Obține fișierele staged
```bash
git diff --cached --name-only
```

### 2. Filtrează fișierele relevante
Include: `.ts`, `.tsx`
Exclude: `*.test.ts`, `package-lock.json`, `*.json` (config), `assets/`

### 3. Invocă agentul code-reviewer
Trimite fișierele filtrate agentului `code-reviewer` cu conținutul lor complet.

### 4. Raport pe severitate
- **CRITIC** (blochează commit): bug-uri, crash, date pierdute, securitate
- **IMPORTANT** (recomandare): performanță, TypeScript slab, UX
- **MINOR** (opțional): naming, style

Nu face auto-fix. Nu face commit.
