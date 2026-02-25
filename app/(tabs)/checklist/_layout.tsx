import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function ChecklistLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.brandDark },
        headerTintColor: Colors.brandGold,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: Colors.white },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
