import type { MaintenancePreset } from '@/types';

export const MAINTENANCE_PRESETS: MaintenancePreset[] = [
  {
    key: 'oil',
    name: 'Schimb ulei',
    icon: 'water-outline',
    trigger_km: 15000,
    trigger_months: 12,
  },
  {
    key: 'timing_belt',
    name: 'Curea distribuție',
    icon: 'cog-outline',
    trigger_km: 60000,
    trigger_months: 60,
  },
  {
    key: 'filters',
    name: 'Filtre (aer, habitaclu, polen)',
    icon: 'funnel-outline',
    trigger_km: 30000,
    trigger_months: 24,
  },
  {
    key: 'service',
    name: 'Revizie generală',
    icon: 'construct-outline',
    trigger_km: 10000,
    trigger_months: 12,
  },
  {
    key: 'itp',
    name: 'ITP',
    icon: 'shield-checkmark-outline',
    trigger_months: 24,
  },
  {
    key: 'brakes',
    name: 'Plăcuțe frână',
    icon: 'disc-outline',
    trigger_km: 40000,
  },
  {
    key: 'coolant',
    name: 'Lichid răcire',
    icon: 'thermometer-outline',
    trigger_km: 90000,
    trigger_months: 48,
  },
  {
    key: 'custom',
    name: 'Personalizat',
    icon: 'add-circle-outline',
  },
];

export function getPreset(key: string | undefined): MaintenancePreset | undefined {
  if (!key) return undefined;
  return MAINTENANCE_PRESETS.find(p => p.key === key);
}
