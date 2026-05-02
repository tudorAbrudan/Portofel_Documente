// app/components/ui/FormPageScreen.tsx
import { ReactNode } from 'react';
import {
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { primary } from '@/theme/colors';
import { BottomActionBar } from './BottomActionBar';

type Props = {
  title: string;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  /** Override pentru butonul stâng din header. Default: „Înapoi" → router.back(). */
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  scrollContentStyle?: ViewStyle;
  children: ReactNode;
};

function DefaultBack() {
  return (
    <Pressable onPress={() => router.back()} style={{ paddingRight: 8 }} hitSlop={8}>
      <Text style={{ color: primary, fontSize: 16 }}>Înapoi</Text>
    </Pressable>
  );
}

export function FormPageScreen({
  title,
  onSave,
  saving = false,
  saveDisabled = false,
  saveLabel = 'Salvează',
  headerLeft,
  headerRight,
  scrollContentStyle,
  children,
}: Props) {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerLeft: () => headerLeft ?? <DefaultBack />,
          headerRight: headerRight ? () => headerRight : undefined,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, { backgroundColor: C.background }]}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, scrollContentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <BottomActionBar
          label={saveLabel}
          onPress={onSave}
          loading={saving}
          disabled={saveDisabled}
          safeArea
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
});
