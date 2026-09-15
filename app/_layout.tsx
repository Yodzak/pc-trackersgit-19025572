import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useApp } from "@/providers/AppProvider";
import { Colors } from "@/constants/colors";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DialogHost } from "@/components/DialogHost";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady) return;

    const route = segments[0] as string | undefined;

    // Ecrans accessibles sans etre connecte.
    const isPublicRoute =
      route === 'login' || route === 'forgot-password' || route === 'reset-password';

    if (!user && !isPublicRoute) {
      router.replace('/login' as any);
      return;
    }

    // Le lien de reinitialisation ouvre une session temporaire. Sans cette
    // exception, l'utilisateur serait aussitot redirige vers le tableau de
    // bord et ne pourrait jamais saisir son nouveau mot de passe.
    if (user && route === 'login') {
      router.replace('/(tabs)/(dashboard)' as any);
    }
  }, [isReady, user, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerBackTitle: "Retour" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-project"
          options={{
            presentation: "modal",
            headerShown: true,
            headerStyle: { backgroundColor: Colors.brandDark },
            headerTintColor: Colors.brandGold,
            headerTitle: "Nouveau Dossier",
            headerTitleStyle: { fontWeight: "700", color: Colors.white },
          }}
        />
      </Stack>
    </AuthGate>
  );
}

const layoutStyles = StyleSheet.create({
  flex: { flex: 1 },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={layoutStyles.flex}>
          <AppProvider>
            <RootLayoutNav />
            {/* Monte au-dessus de toute la navigation pour que la modale
                recouvre l'ecran courant, quel qu'il soit. */}
            <DialogHost />
          </AppProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
