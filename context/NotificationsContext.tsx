import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRegisterPushToken } from "@workspace/api-client-react";

import { useAuth } from "./AuthContext";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

interface NotificationsState {
  scheduleLocalNotification: (title: string, body: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsState>({
  scheduleLocalNotification: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { token: authToken } = useAuth();
  const { mutate: registerToken } = useRegisterPushToken();
  const registeredForRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!authToken) return;

    async function register() {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Quiniela Mundial",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#2563ebFF",
            showBadge: true,
          });
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "0e5ea497-5020-479c-9479-9a964c303b21",
        });
        const pushToken = tokenData.data;

        if (registeredForRef.current === pushToken) return;
        registeredForRef.current = pushToken;

        registerToken({ data: { token: pushToken } });
      } catch {
      }
    }

    void register();
  }, [authToken, registerToken]);

  const scheduleLocalNotification = useCallback(async (title: string, body: string) => {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") return;
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: null,
      });
    } catch {
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{ scheduleLocalNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
