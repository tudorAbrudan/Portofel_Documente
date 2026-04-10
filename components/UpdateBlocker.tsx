import { Pressable, Linking, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { primary } from '@/theme/colors';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface Props {
  version: string;
  url: string;
}

export function UpdateBlocker({ version, url }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: C.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: C.card }]}>
          <Ionicons name="arrow-up-circle" size={56} color={primary} />
        </View>

        <Text style={[styles.title, { color: C.text }]}>Actualizare necesară</Text>

        <Text style={[styles.body, { color: C.textSecondary }]}>
          Versiunea ta de Dosar nu mai este suportată.{'\n'}
          Instalează versiunea{' '}
          <Text style={[styles.versionBold, { color: C.text }]}>{version}</Text>
          {' '}pentru a continua.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => Linking.openURL(url)}
        >
          <Ionicons name="logo-apple-appstore" size={20} color="#fff" style={styles.btnIcon} />
          <Text style={styles.btnText}>Actualizează din App Store</Text>
        </Pressable>

        <Text style={[styles.hint, { color: C.textSecondary }]}>
          Datele tale sunt în siguranță pe dispozitiv.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
    backgroundColor: 'transparent',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  versionBold: {
    fontWeight: '700',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
    gap: 10,
  },
  btnIcon: {
    flexShrink: 0,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 4,
  },
});
