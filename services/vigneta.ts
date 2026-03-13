export interface VignetaCountry {
  code: string;
  name: string;
  required: boolean;
  validityOptions: string[];
  note?: string;
  buyUrl?: string;
}

export const VIGNETA_COUNTRIES: VignetaCountry[] = [
  { code: 'AT', name: 'Austria', required: true, validityOptions: ['10 zile', '2 luni', '1 an'], buyUrl: 'https://www.asfinag.at/toll/vignette/' },
  { code: 'CH', name: 'Elveția', required: true, validityOptions: ['1 an'], buyUrl: 'https://www.ch.ch/en/motorway-vignette/' },
  { code: 'CZ', name: 'Cehia', required: true, validityOptions: ['1 zi', '10 zile', '1 lună', '1 an'], buyUrl: 'https://edalnice.cz/en/' },
  { code: 'SK', name: 'Slovacia', required: true, validityOptions: ['1 zi', '10 zile', '1 lună', '1 an'], buyUrl: 'https://eznamka.sk/en/' },
  { code: 'HU', name: 'Ungaria', required: true, validityOptions: ['1 zi', '10 zile', '1 lună', '1 an'], buyUrl: 'https://ematrica.nemzetiutdij.hu/ugyintezesek/vignette_purchase' },
  { code: 'SI', name: 'Slovenia', required: true, validityOptions: ['7 zile', '1 lună', '6 luni', '1 an'], buyUrl: 'https://evinjeta.dars.si/en' },
  { code: 'RO', name: 'România', required: true, validityOptions: ['7 zile', '1 lună', '3 luni', '1 an'], note: 'Rovinieta', buyUrl: 'https://www.roviniete.ro/ro/cumpara-rovinieta/' },
  { code: 'BG', name: 'Bulgaria', required: true, validityOptions: ['1 zi', '7 zile', '1 lună', '1 an'], buyUrl: 'https://bgtoll.bg/en/' },
  { code: 'HR', name: 'Croația', required: false, validityOptions: [], note: 'Taxă per kilometru pe autostradă (nu vignetă)' },
  { code: 'DE', name: 'Germania', required: false, validityOptions: [], note: 'Fără vignetă' },
  { code: 'FR', name: 'Franța', required: false, validityOptions: [], note: 'Taxe per tronson' },
  { code: 'IT', name: 'Italia', required: false, validityOptions: [], note: 'Taxe per tronson' },
  { code: 'PL', name: 'Polonia', required: false, validityOptions: [], note: 'E-toll pe autostrăzi' },
  { code: 'NL', name: 'Olanda', required: false, validityOptions: [] },
  { code: 'BE', name: 'Belgia', required: false, validityOptions: [] },
  { code: 'LU', name: 'Luxemburg', required: false, validityOptions: [] },
  { code: 'PT', name: 'Portugalia', required: false, validityOptions: [], note: 'Taxe electronice Via Verde' },
  { code: 'ES', name: 'Spania', required: false, validityOptions: [], note: 'Taxe per tronson' },
];

export function getRequiredCountries(): VignetaCountry[] {
  return VIGNETA_COUNTRIES.filter((c) => c.required);
}

export function checkVignetaNeeded(countryCode: string): boolean {
  const country = VIGNETA_COUNTRIES.find((c) => c.code === countryCode);
  return country?.required ?? false;
}
