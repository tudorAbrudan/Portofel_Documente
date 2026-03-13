import { Stack } from 'expo-router';

export default function DocumenteLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Înapoi' }}>
      <Stack.Screen name="index" options={{ title: 'Documente', headerShown: false }} />
      <Stack.Screen name="add" options={{ title: 'Adaugă document' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detaliu document' }} />
    </Stack>
  );
}
