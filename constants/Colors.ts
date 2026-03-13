/**
 * Culori app – delegare către theme (EVPoint + #9EB567)
 */
import { light, dark } from '@/theme/colors';

export default {
  light: {
    ...light,
    tint: light.primary,
  },
  dark: {
    ...dark,
    tint: dark.primary,
  },
};
