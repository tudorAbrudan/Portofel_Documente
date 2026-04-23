import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { REVIEW_PROMPT_EVENT, recordAppOpen } from '@/services/reviewPrompt';

/**
 * Se montează la nivel de root layout. Înregistrează o sesiune la prima montare
 * și ascultă evenimentul emis de triggerele de review → setează `visible` pe true.
 */
export function useReviewPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void recordAppOpen();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(REVIEW_PROMPT_EVENT, () => {
      setVisible(true);
    });
    return () => sub.remove();
  }, []);

  return {
    visible,
    dismiss: () => setVisible(false),
  };
}
