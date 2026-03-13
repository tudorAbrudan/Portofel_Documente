# Run Tests – /test

Rulează testele pentru logica critică (servicii, hooks).

## Detectare automată
Dacă nu se specifică nimic, analizează `git diff --name-only HEAD` și rulează testele relevante.

## Comenzi
```bash
# Toate testele
cd /Users/ax/work/documents/app && npx jest --passWithNoTests

# Specific
cd /Users/ax/work/documents/app && npx jest services/ --passWithNoTests
cd /Users/ax/work/documents/app && npx jest hooks/ --passWithNoTests
```

## Raport
- Total: X passed, Y failed
- Pentru fiecare failure: fișier, test name, eroare
- Sugestie de fix pentru failure-uri comune

## Note
- Testele există (sau vor exista) în `__tests__/` sau `*.test.ts` lângă servicii.
- Dacă nu există teste: menționează și sugerează ce ar trebui testat.
