import { Children, cloneElement, isValidElement, ReactNode } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { light, dark } from '@/theme/colors';
import { DocumentDetailRow } from '@/components/DocumentDetailRow';

type Tone = 'default' | 'sensitive';

interface Props {
  title?: string;
  /** Header custom care înlocuiește complet `title` (ex. notă privată cu toggle). */
  header?: ReactNode;
  tone?: Tone;
  children: ReactNode;
}

export function DocumentDetailCard({ title, header, tone = 'default', children }: Props) {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? dark : light;
  const isSensitive = tone === 'sensitive';

  // Auto-marchează ultimul DocumentDetailRow cu last={true} pentru a suprima separatorul jos.
  const childArray = Children.toArray(children).filter(Boolean);
  let lastRowIdx = -1;
  for (let i = childArray.length - 1; i >= 0; i--) {
    const c = childArray[i];
    if (isValidElement(c) && c.type === DocumentDetailRow) {
      lastRowIdx = i;
      break;
    }
  }
  const renderedChildren = childArray.map((child, idx) => {
    if (idx === lastRowIdx && isValidElement(child) && child.type === DocumentDetailRow) {
      return cloneElement(child as React.ReactElement<{ last?: boolean }>, { last: true });
    }
    return child;
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isSensitive ? palette.sensitiveBg : palette.card,
          borderColor: isSensitive ? palette.sensitiveBorder : 'transparent',
          borderWidth: isSensitive ? 1 : 0,
          shadowColor: isSensitive ? 'transparent' : palette.cardShadow,
          shadowOpacity: isSensitive ? 0 : 1,
        },
      ]}
    >
      {header ? (
        <View style={styles.headerWrap}>{header}</View>
      ) : title ? (
        <Text
          style={[styles.title, { color: isSensitive ? palette.sensitive : palette.textSecondary }]}
        >
          {title}
        </Text>
      ) : null}
      {renderedChildren}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  headerWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
});
