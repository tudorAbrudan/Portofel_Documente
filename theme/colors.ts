/**
 * Design system – EVPoint style + primary #9EB567
 * @see docs/DESIGN_SYSTEM.md
 */

export const primary = '#9EB567';

export const light = {
  primary: '#9EB567',
  text: '#1a1a1a',
  textSecondary: '#666',
  background: '#f5f5f5',
  surface: '#ffffff',
  border: '#e0e0e0',
  tabIconDefault: '#999',
  tabIconSelected: '#9EB567',
  card: '#ffffff',
  cardShadow: 'rgba(0,0,0,0.08)',
};

export const dark = {
  primary: '#9EB567',
  text: '#f5f5f5',
  textSecondary: '#aaa',
  background: '#121212',
  surface: '#1e1e1e',
  border: '#333',
  tabIconDefault: '#666',
  tabIconSelected: '#9EB567',
  card: '#1e1e1e',
  cardShadow: 'rgba(0,0,0,0.3)',
};

export type ColorScheme = 'light' | 'dark';

export default { primary, light, dark };
