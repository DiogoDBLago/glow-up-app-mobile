import '../global.css';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StoreProvider } from '@/lib/store';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StoreProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </StoreProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
