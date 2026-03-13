# Design system – EVPoint + #9EB567

## Design ales
- **Kit:** EVPoint (Figma) – EV Charging Station Finder App UI Kit.
- **Primary color:** `#9EB567` (înlocuiește verdele din kit).
- **Design system detaliat:** `docs/DESIGN_SYSTEM.md`.

## Principii
- **Un singur design system** – nu amesteca stiluri ad-hoc cu componente din design system.
- **Consistență:** butoane, carduri, culori, fonturi, spacing identice în toată aplicația.
- **Mobile-first:** iOS first; Android când prinde tracțiune.

## Culori (din `theme/` și `constants/Theme.ts`)
- Primary: `#9EB567`
- Background: conform theme (light/dark)
- Text: conform theme
- Accent/secondary: conform design system

## Componente
- Folosește componente din `components/` (Themed, AppLockScreen etc.).
- Butoane: stil consistent, dimensiuni standard.
- Carduri: padding, border-radius, shadow conform design system.
- Icons: Expo Vector Icons (Ionicons / MaterialIcons).

## Spacing
- Folosește constante din `theme/` pentru spacing (nu valori magice).
- Grid: 8px base unit.
