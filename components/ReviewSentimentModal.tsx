import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { primary, primaryMuted } from '@/theme/colors';
import { radius, spacing } from '@/theme/layout';
import {
  handleNegativeSentiment,
  handlePositiveSentiment,
  handlePostponeSentiment,
} from '@/services/reviewPrompt';

interface ReviewSentimentModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ReviewSentimentModal({ visible, onDismiss }: ReviewSentimentModalProps) {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];

  async function onLove() {
    onDismiss();
    await handlePositiveSentiment();
  }

  async function onImprove() {
    onDismiss();
    await handleNegativeSentiment();
  }

  async function onLater() {
    onDismiss();
    await handlePostponeSentiment();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={[styles.title, { color: C.text }]}>Cum ți se pare Dosar?</Text>
          <Text style={[styles.body, { color: C.textSecondary ?? C.text }]}>
            Ne ajută să știm dacă aplicația îți face viața mai ușoară — sau dacă putem face mai
            bine.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onLove}
          >
            <Text style={styles.primaryBtnText}>Îmi place 🙂</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: primaryMuted, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onImprove}
          >
            <Text style={[styles.secondaryBtnText, { color: primary }]}>Poate fi mai bine</Text>
          </Pressable>

          <Pressable style={styles.tertiaryBtn} onPress={onLater}>
            <Text style={[styles.tertiaryBtnText, { color: C.textSecondary ?? C.text }]}>
              Mai târziu
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryBtn: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  tertiaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
