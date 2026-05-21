import AsyncStorage from "@react-native-async-storage/async-storage";
import { useListMessages, getListMessagesQueryKey, type UserMessage } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationsContext";

const getLastSeenKey = (userId: number) => `quiniela_last_seen_message_${userId}`;

interface MessagesState {
  hasNew: boolean;
  messages: UserMessage[] | undefined;
  markSeen: () => void;
}

const MessagesContext = createContext<MessagesState>({ hasNew: false, messages: undefined, markSeen: () => {} });

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { scheduleLocalNotification } = useNotifications();
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const prevMessageIdsRef = useRef<Set<number> | null>(null);

  const { data: messages } = useListMessages({
    query: { enabled: !!user, refetchInterval: 30_000, queryKey: getListMessagesQueryKey() },
  });

  useEffect(() => {
    if (!user) {
      setLastSeenAt(null);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    AsyncStorage.getItem(getLastSeenKey(user.id))
      .then((v) => { setLastSeenAt(v); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, [user?.id]);

  useEffect(() => {
    if (!messages || !user) {
      prevMessageIdsRef.current = null;
      return;
    }

    const currentIds = new Set(messages.map((m) => m.id));

    if (prevMessageIdsRef.current === null) {
      prevMessageIdsRef.current = currentIds;
      return;
    }

    const newMessages = messages.filter((m) => !prevMessageIdsRef.current!.has(m.id));
    prevMessageIdsRef.current = currentIds;

    if (newMessages.length > 0) {
      const first = newMessages[0];
      const title = newMessages.length === 1 ? "Nuevo mensaje" : `${newMessages.length} mensajes nuevos`;
      const body = first.subject
        ? first.subject
        : first.content.length > 100
          ? first.content.slice(0, 97) + "…"
          : first.content;
      scheduleLocalNotification(title, body).catch(() => {});
    }
  }, [messages, user, scheduleLocalNotification]);

  const hasNew =
    loaded &&
    !!user &&
    !!messages &&
    messages.length > 0 &&
    (!lastSeenAt || messages.some((m) => new Date(m.createdAt) > new Date(lastSeenAt)));

  const markSeen = useCallback(() => {
    if (!user || !messages || messages.length === 0) return;
    const latestAt = messages.reduce((acc, m) => {
      const d = new Date(m.createdAt).toISOString();
      return d > acc ? d : acc;
    }, "");
    if (latestAt) {
      AsyncStorage.setItem(getLastSeenKey(user.id), latestAt).catch(() => {});
      setLastSeenAt(latestAt);
    }
  }, [user, messages]);

  return (
    <MessagesContext.Provider value={{ hasNew, messages, markSeen }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}
