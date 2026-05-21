import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashLoader } from "@/components/SplashLoader";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { ThemeProvider } from "@/context/ThemeContext";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN ?? "wiseworldcup.replit.app"}`);

SplashScreen.preventAutoHideAsync();

// Disable Android system font scaling globally so the app looks the same
// regardless of the user's accessibility font-size setting.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Text as any).defaultProps = { ...((Text as any).defaultProps ?? {}), allowFontScaling: false };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps ?? {}), allowFontScaling: false };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGate() {
  const { token, isLoading, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "(auth)";
    if (!token && !inAuth) {
      router.replace("/(auth)/login");
    } else if (token && inAuth) {
      router.replace("/(tabs)");
    }
  }, [token, isLoading, router, segments]);

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      void logout();
      router.replace("/(auth)/login");
    }, 12 * 60 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [logout, router, token]);

  return null;
}

function NotificationTapHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)/system");
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
      <NotificationTapHandler />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen
          name="match/[id]"
          options={{
            title: "Partido",
            headerStyle: { backgroundColor: "#060e1a" },
            headerTintColor: "#dbeafe",
            headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: "#dbeafe" },
            headerBackTitle: "Volver",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // Hide the NATIVE splash as soon as fonts are ready so the animated
  // SplashLoader becomes visible. We then keep showing SplashLoader for
  // the full minTimeElapsed duration (6 s) before rendering the real app.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!minTimeElapsed || (!fontsLoaded && !fontError)) return <SplashLoader />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NotificationsProvider>
                <MessagesProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                      <RootLayoutNav />
                  </GestureHandlerRootView>
                </MessagesProvider>
              </NotificationsProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
