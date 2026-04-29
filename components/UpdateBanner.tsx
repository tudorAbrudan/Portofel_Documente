import { Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { primary } from '@/theme/colors';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { openAppStore } from '@/services/updateCheck';

interface Props {
  version: string;
  onDismiss: () => void;
}

export function UpdateBanner({ version, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: C.card,
          paddingTop: insets.top + 6,
          borderBottomColor: C.border,
        },
      ]}
    >
      <Ionicons name="arrow-up-circle-outline" size={18} color={primary} style={styles.icon} />

      <Text style={[styles.text, { color: C.text }]} numberOfLines={1}>
        Versiune <Text style={[styles.versionBold, { color: primary }]}>{version}</Text> disponibilă
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.updateBtn,
          { borderColor: primary, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => openAppStore()}
        hitSlop={8}
      >
        <Text style={[styles.updateBtnText, { color: primary }]}>Actualizează</Text>
      </Pressable>

      <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
        <Ionicons name="close" size={18} color={C.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 500,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
  },
  versionBold: {
    fontWeight: '700',
  },
  updateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  updateBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    flexShrink: 0,
  },
});
