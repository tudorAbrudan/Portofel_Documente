# Idei viitoare — Dosar

> Principiu: **nu adăugăm complexitate inutilă**. Fiecare idee trebuie să răspundă la:
> 1. Câți utilizatori beneficiază real?
> 2. Poate fi implementat local-first (fără backend)?
> 3. Merită complexitatea față de valoarea adăugată?

---

## 📊 Analiză cheltuieli & grafice

### Grafic consum facturi (furnizori)
**Idee:** Din facturile scanate (E.ON, Electrica, gaze, apă), extrage valorile și afișează evoluția lunară.
**De analizat:**
- OCR + AI extrage `amount` și `issue_date` din facturi → deja implementat în metadata
- Grupare pe `supplier` (câmpul `supplier` din metadata facturi)
- Grafic linie simplu pe 12 luni
**Dependențe:** Necesită o librărie de grafice (ex. `react-native-svg` + `victory-native` sau similar)
**Risc:** Calitatea datelor depinde de OCR — valorile pot fi greșite. Necesită confirmare manuală.
**Verdict:** ✅ Fezabil local-first. Valoros dacă utilizatorul are 6+ facturi scanate.

---

### Analiză cheltuieli generale
**Idee:** Categorii de cheltuieli (întreținere, chirie, transport, haine, educație, ieșit în oraș) + verdict sustenabilitate.
**De analizat:**
- Necesită că utilizatorul să marcheze fiecare document ca "cheltuială" și să confirme suma + categoria
- Câmpurile `amount` și `categorie_cheltuiala` pe orice tip de document
- Raport lunar: total pe categorie, % din venit (dacă utilizatorul introduce venitul)
- "Sustenabilitate": comparație cu bugete standard (50/30/20 rule sau custom)
**Risc mare:**
  - Datele financiare personale sunt sensibile — GDPR implicații
  - OCR greșit = cheltuieli incorecte = concluzii greșite → stres inutil
  - Necesită disciplină din partea utilizatorului (să scaneze toate facturile)
**Alternativă mai simplă:** Doar total cheltuieli per categorie, fără verdict de sustenabilitate
**Verdict:** ⚠️ Posibil, dar complexitate ridicată. De pornit cu ceva simplu (total per tip document).

---

### Grafic consum carburant + cheltuieli/mașină
**Idee:** Per vehicul: evoluție cheltuieli (RCA, ITP, CASCO, reparații, carburant).
**De analizat:**
- Documentele legate de vehicul există deja (multi-entitate implementat)
- Suma totală cheltuită pe vehicul = sumă `amount` din documentele legate de acel vehicul
- Carburantul necesită un nou tip de document ("bon carburant") cu câmpuri: litri, preț/litru, km
- Grafic: cheltuieli cumulate pe lună per vehicul
**Verdict:** ✅ Cel mai fezabil dintre cele trei. Datele sunt deja structurate.

---

## 🔮 Alte idei (necategorizate)

*Adaugă idei noi aici cu `##` sau `-` bullet.*

---

## 🚫 Idei respinse / amânate

| Idee | Motiv |
|------|-------|
| Sync cloud / backend | App local-first by design. Backup ZIP pe Drive e suficient. |
| Buget lunar automat din extrase bancare | OCR pe extrase = risc date bancare sensibile în bundle |
| Notificări push de server | Nu există backend, notificările locale sunt suficiente |

---

## Cum folosim acest fișier

- **Idee nouă** → adaug în secțiunea potrivită cu context și verdict
- **Idee validată** → mut în `PLAN.md` (dacă există) cu task-uri concrete
- **Idee respinsă** → mut în tabelul de mai jos cu motivul

*Ultima actualizare: 2026-03-30*
