import { Feather } from "@expo/vector-icons";
import {
  useListMyPredictions,
  useListMatches,
  useUpdateMatchResult,
  getListMyPredictionsQueryKey,
  getListMessagesQueryKey,
  getListMatchesQueryKey,
} from "@workspace/api-client-react";
import type { Match } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { ComposeMessageModal } from "@/components/ComposeMessageModal";
import { ms } from "@/utils/scale";

type SystemTab = "perfil" | "mensajes" | "apariencia" | "informacion" | "partidos";

const BASE_TABS: { key: SystemTab; label: string; icon: string }[] = [
  { key: "informacion", label: "Info", icon: "info" },
  { key: "perfil", label: "Perfil", icon: "user" },
  { key: "mensajes", label: "Mensajes", icon: "bell" },
  { key: "apariencia", label: "Tema", icon: "sliders" },
];

const ADMIN_TAB: { key: SystemTab; label: string; icon: string } = {
  key: "partidos", label: "Partidos", icon: "sliders",
};

// ─── Perfil tab ────────────────────────────────────────────────────────────
function PerfilTab() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { data: predictions } = useListMyPredictions({ query: { enabled: !!user, queryKey: getListMyPredictionsQueryKey() } });

  if (!user) return null;

  const initials = (user.name.charAt(0) + (user.name.split(" ")[1]?.charAt(0) ?? "")).toUpperCase();
  const totalPreds = predictions?.length ?? 0;
  const exactScores = predictions?.filter((p) => p.pointsEarned === 3).length ?? 0;
  const correctWinners = predictions?.filter((p) => p.pointsEarned === 1).length ?? 0;
  const failed = predictions?.filter((p) => p.pointsEarned === 0).length ?? 0;
  const pending = predictions?.filter((p) => p.pointsEarned === null).length ?? 0;

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.profileTop}>
        <LinearGradient colors={[`${colors.primary}30`, `${colors.primary}08`]} style={styles.avatarRing}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatarCircle} contentFit="cover" />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
        </LinearGradient>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{user.name}</Text>
        <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
        {user.role === "admin" && (
          <View style={[styles.adminBadge, { backgroundColor: `${colors.gold}20`, borderColor: `${colors.gold}50` }]}>
            <Feather name="shield" size={11} color={colors.gold} />
            <Text style={[styles.adminTxt, { color: colors.gold }]}>Administrador</Text>
          </View>
        )}
      </View>

      {/* Points hero */}
      <View style={[styles.ptsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient colors={[`${colors.primary}10`, "transparent"]} style={StyleSheet.absoluteFill} />
        <Feather name="award" size={20} color={colors.primary} />
        <Text style={[styles.ptsNum, { color: colors.primary }]}>{user.totalPoints}</Text>
        <Text style={[styles.ptsLabel, { color: colors.mutedForeground }]}>Puntos totales</Text>
      </View>

      {/* Stats */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MIS PRONÓSTICOS</Text>
      <View style={styles.statsGrid}>
        {[
          { label: "Total", value: totalPreds, color: colors.foreground },
          { label: "Exactos", value: exactScores, color: colors.primary },
          { label: "Ganador", value: correctWinners, color: colors.gold },
          { label: "Fallidos", value: failed, color: colors.destructive },
          { label: "Pendientes", value: pending, color: "#60a5fa" },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Account */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CUENTA</Text>
      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/(tabs)/leaderboard")}
        >
          <Feather name="bar-chart-2" size={18} color={colors.primary} />
          <Text style={[styles.menuLabel, { color: colors.foreground }]}>Ver tabla general</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.menuLabel, { color: colors.destructive }]}>Cerrar sesión</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Mensajes tab ──────────────────────────────────────────────────────────
interface MensajesTabProps {
  onCompose?: () => void;
  isAdmin?: boolean;
}

function MensajesTab({ onCompose, isAdmin }: MensajesTabProps) {
  const colors = useColors();
  const { messages } = useMessages();
  const isLoading = messages === undefined;

  if (isLoading) {
    return (
      <View style={styles.centeredTab}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <View style={styles.centeredTab}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Feather name="bell" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin mensajes</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No tienes mensajes por el momento
        </Text>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.composeBtn, { backgroundColor: colors.primary }]}
            onPress={onCompose}
          >
            <Feather name="edit-3" size={15} color="#fff" />
            <Text style={styles.composeBtnTxt}>Redactar mensaje</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { gap: 10 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {isAdmin && (
        <TouchableOpacity
          style={[styles.composeBtn, { backgroundColor: colors.primary }]}
          onPress={onCompose}
        >
          <Feather name="edit-3" size={15} color="#fff" />
          <Text style={styles.composeBtnTxt}>Redactar mensaje</Text>
        </TouchableOpacity>
      )}
      {messages.map((msg) => {
        const isPriv = msg.type === "privado";
        const isAdminMsg = msg.fromRole === "admin";
        const accentColor = isPriv ? colors.gold : colors.primary;
        const dt = new Date(msg.createdAt);
        const fecha =
          dt.toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Tegucigalpa" }) +
          " " +
          dt.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit", timeZone: "America/Tegucigalpa" });

        return (
          <View
            key={msg.id}
            style={[styles.msgCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accentColor }]}
          >
            <View style={styles.msgHeader}>
              <View style={styles.msgHeaderLeft}>
                <View style={[styles.msgTypeBadge, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }]}>
                  <Feather name={isPriv ? "lock" : "globe"} size={9} color={accentColor} />
                  <Text style={[styles.msgTypeTxt, { color: accentColor }]}>
                    {isPriv ? "Privado" : "Público"}
                  </Text>
                </View>
                <Text style={[styles.msgFrom, { color: colors.foreground }]}>{msg.fromName}</Text>
                {isAdminMsg && (
                  <View style={[styles.adminPill, { backgroundColor: `${colors.gold}18`, borderColor: `${colors.gold}40` }]}>
                    <Text style={[styles.adminPillTxt, { color: colors.gold }]}>Admin</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.msgDate, { color: colors.mutedForeground }]}>{fecha}</Text>
            </View>
            {msg.subject ? (
              <Text style={[styles.msgSubject, { color: colors.foreground }]}>{msg.subject}</Text>
            ) : null}
            <Text style={[styles.msgContent, { color: colors.mutedForeground }]}>{msg.content}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Apariencia tab ────────────────────────────────────────────────────────
function AparienciaTab() {
  const colors = useColors();
  const { mode, setMode } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MODO DE PANTALLA</Text>
      <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.modeLeft}>
          <Feather name={mode === "dark" ? "moon" : "sun"} size={20} color={colors.primary} />
          <View style={{ gap: 2 }}>
            <Text style={[styles.modeLabel, { color: colors.foreground }]}>
              {mode === "dark" ? "Modo oscuro" : "Modo claro"}
            </Text>
            <Text style={[styles.modeSub, { color: colors.mutedForeground }]}>
              {mode === "dark" ? "Fondo oscuro, ideal para la noche" : "Fondo claro, ideal para el día"}
            </Text>
          </View>
        </View>
        <Switch
          value={mode === "dark"}
          onValueChange={(v) => {
            setMode(v ? "dark" : "light");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          trackColor={{ false: colors.surface3, true: `${colors.primary}80` }}
          thumbColor={mode === "dark" ? colors.primary : colors.mutedForeground}
        />
      </View>
    </ScrollView>
  );
}

// ─── Información tab ───────────────────────────────────────────────────────
const TECH_STACK = [
  { label: "React Native", color: "#61dafb" },
  { label: "TypeScript",   color: "#3178c6" },
  { label: "Node.js",      color: "#68a063" },
  { label: "PHP",          color: "#8b5cf6" },
  { label: "MySQL",        color: "#f59e0b" },
  { label: "React",        color: "#61dafb" },
  { label: "Express",      color: "#94a3b8" },
  { label: "Expo",         color: "#a3e635" },
];

const SERVICES: { icon: string; label: string }[] = [
  { icon: "smartphone", label: "Apps Móviles" },
  { icon: "globe",      label: "Web Apps" },
  { icon: "server",     label: "APIs REST" },
  { icon: "database",   label: "Bases de Datos" },
];

function InformacionTab() {
  const colors  = useColors();
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(22)).current;

  const ACCENT = "#2563eb";
  const GOLD   = "#f59e0b";

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.infoScroll} showsVerticalScrollIndicator={false}>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#070f1c", "#0a1628", "#0d2040"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.infoHero}
      >
        <View style={styles.infoLogoWrap}>
          <LinearGradient colors={[ACCENT, "#1d4ed8"]} style={styles.infoLogoGrad}>
            <Text style={styles.infoLogoTxt}>S</Text>
          </LinearGradient>
        </View>
        <Text style={styles.infoCompany}>SisysErint</Text>
        <Text style={styles.infoSlogan}>Soluciones Tecnológicas Empresariales</Text>
        <View style={[styles.infoDividerH, { backgroundColor: "rgba(255,255,255,0.10)", marginTop: 16 }]} />
        <View style={styles.infoAppBadge}>
          <Feather name="globe" size={11} color="rgba(255,255,255,0.5)" />
          <Text style={styles.infoAppBadgeTxt}>FIFA World Cup 2026 — Quiniela v1.0</Text>
        </View>
      </LinearGradient>

      {/* ── Animated body ───────────────────────────────────────── */}
      <Animated.View
        style={[styles.infoBody, { backgroundColor: colors.background, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Developer card */}
        <View style={[styles.devCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={[`${ACCENT}12`, "transparent"]} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
          <View style={[styles.devAvatar, { backgroundColor: `${ACCENT}20`, borderColor: `${ACCENT}50` }]}>
            <Text style={[styles.devAvatarTxt, { color: ACCENT }]}>CE</Text>
          </View>
          <View style={styles.devInfo}>
            <Text style={[styles.devName, { color: colors.foreground }]}>Cristian A. Espinoza</Text>
            <View style={styles.devRoleRow}>
              <Feather name="code" size={11} color={ACCENT} />
              <Text style={[styles.devRole, { color: ACCENT }]}>Desarrollado por</Text>
            </View>
            <View style={[styles.devBadge, { backgroundColor: `${GOLD}18`, borderColor: `${GOLD}40` }]}>
              <Feather name="briefcase" size={10} color={GOLD} />
              <Text style={[styles.devBadgeTxt, { color: GOLD }]}>SisysErint · Honduras</Text>
            </View>
          </View>
        </View>

        {/* Tech stack */}
        <View style={styles.infoBlock}>
          <View style={styles.infoBlockHeader}>
            <Feather name="layers" size={13} color={ACCENT} />
            <Text style={[styles.infoBlockTitle, { color: colors.foreground }]}>Tecnologías de interés</Text>
          </View>
          <View style={styles.techChips}>
            {TECH_STACK.map((t) => (
              <View key={t.label} style={[styles.techChip, { backgroundColor: `${t.color}14`, borderColor: `${t.color}40` }]}>
                <Text style={[styles.techChipTxt, { color: t.color }]}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Services */}
        <View style={styles.infoBlock}>
          <View style={styles.infoBlockHeader}>
            <Feather name="tool" size={13} color={ACCENT} />
            <Text style={[styles.infoBlockTitle, { color: colors.foreground }]}>Servicios</Text>
          </View>
          <View style={styles.servicesGrid}>
            {SERVICES.map((s) => (
              <View key={s.label} style={[styles.serviceItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.serviceIcon, { backgroundColor: `${ACCENT}18` }]}>
                  <Feather name={s.icon as any} size={16} color={ACCENT} />
                </View>
                <Text style={[styles.serviceLabel, { color: colors.foreground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.infoBlock}>
          <View style={styles.infoBlockHeader}>
            <Feather name="at-sign" size={13} color={ACCENT} />
            <Text style={[styles.infoBlockTitle, { color: colors.foreground }]}>Contacto</Text>
          </View>
          <TouchableOpacity
            style={[styles.contactRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Linking.openURL("mailto:soporte@sisyserint.com")}
          >
            <View style={[styles.contactIcon, { backgroundColor: `${ACCENT}18`, borderColor: `${ACCENT}30` }]}>
              <Feather name="mail" size={15} color={ACCENT} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.contactLabel, { color: colors.mutedForeground }]}>CORREO ELECTRÓNICO</Text>
              <Text style={[styles.contactValue, { color: colors.foreground }]}>soporte@sisyserint.com</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Linking.openURL("https://sisyserint.com")}
          >
            <View style={[styles.contactIcon, { backgroundColor: `${ACCENT}18`, borderColor: `${ACCENT}30` }]}>
              <Feather name="globe" size={15} color={ACCENT} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.contactLabel, { color: colors.mutedForeground }]}>SITIO WEB</Text>
              <Text style={[styles.contactValue, { color: colors.foreground }]}>sisyserint.com</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={[styles.appInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.appInfoRow}>
            <Text style={[styles.appInfoKey, { color: colors.mutedForeground }]}>Versión</Text>
            <Text style={[styles.appInfoVal, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <View style={[styles.appInfoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.appInfoRow}>
            <Text style={[styles.appInfoKey, { color: colors.mutedForeground }]}>Plataforma</Text>
            <Text style={[styles.appInfoVal, { color: colors.foreground }]}>
              {Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}
            </Text>
          </View>
          <View style={[styles.appInfoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.appInfoRow}>
            <Text style={[styles.appInfoKey, { color: colors.mutedForeground }]}>Edición</Text>
            <Text style={[styles.appInfoVal, { color: colors.foreground }]}>FIFA World Cup 2026</Text>
          </View>
        </View>

        {/* Copyright */}
        <View style={[styles.infoCopyright, { borderColor: colors.border }]}>
          <Feather name="shield" size={12} color={colors.mutedForeground} />
          <Text style={[styles.infoCopyrightTxt, { color: colors.mutedForeground }]}>
            © 2026 SisysErint · Todos los derechos reservados
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Partidos Admin tab ─────────────────────────────────────────────────────
type MatchStatus = "scheduled" | "live" | "finished";
const STATUS_FILTERS: { key: MatchStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "scheduled", label: "Programados" },
  { key: "live", label: "En vivo" },
  { key: "finished", label: "Finalizados" },
];

function StatusBadge({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  if (status === "live") return (
    <View style={{ backgroundColor: "#ef444420", borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "#ef444440" }}>
      <Text style={{ fontSize: ms(10), fontFamily: "Inter_700Bold", color: "#ef4444" }}>● En vivo</Text>
    </View>
  );
  if (status === "finished") return (
    <View style={{ backgroundColor: `${colors.mutedForeground}18`, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: `${colors.mutedForeground}30` }}>
      <Text style={{ fontSize: ms(10), fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Finalizado</Text>
    </View>
  );
  return (
    <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: `${colors.primary}35` }}>
      <Text style={{ fontSize: ms(10), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Programado</Text>
    </View>
  );
}

function EditMatchModal({
  match,
  visible,
  onClose,
}: {
  match: Match | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const update = useUpdateMatchResult();

  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [status, setStatus] = useState<MatchStatus>("scheduled");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (match) {
      setHomeScore(String(match.homeScore ?? 0));
      setAwayScore(String(match.awayScore ?? 0));
      setStatus(match.status as MatchStatus);
    }
  }, [match]);

  const handleSave = () => {
    if (!match) return;
    const home = parseInt(homeScore, 10);
    const away = parseInt(awayScore, 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      Alert.alert("Error", "Ingresa marcadores válidos (0 o más)");
      return;
    }
    setSaving(true);
    update.mutate(
      { id: match.id, data: { homeScore: home, awayScore: away, status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSaving(false);
          onClose();
        },
        onError: () => {
          Alert.alert("Error", "No se pudo actualizar el partido");
          setSaving(false);
        },
      }
    );
  };

  if (!match) return null;

  const STATUS_OPTIONS: { key: MatchStatus; label: string; color: string }[] = [
    { key: "scheduled", label: "Programado", color: colors.primary },
    { key: "live", label: "En vivo", color: "#ef4444" },
    { key: "finished", label: "Finalizado", color: colors.mutedForeground },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Feather name="edit-2" size={16} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar Partido</Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: "auto" }}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Teams */}
          <View style={styles.modalTeams}>
            {match.teamHomeFlagUrl ? (
              <Image source={{ uri: match.teamHomeFlagUrl }} style={{ width: 28, height: 19, borderRadius: 3 }} contentFit="cover" />
            ) : null}
            <Text style={[styles.modalTeamName, { color: colors.foreground }]} numberOfLines={1}>{match.teamHome}</Text>
            <Text style={[styles.modalVs, { color: colors.mutedForeground }]}>vs</Text>
            <Text style={[styles.modalTeamName, { color: colors.foreground }]} numberOfLines={1}>{match.teamAway}</Text>
            {match.teamAwayFlagUrl ? (
              <Image source={{ uri: match.teamAwayFlagUrl }} style={{ width: 28, height: 19, borderRadius: 3 }} contentFit="cover" />
            ) : null}
          </View>

          {/* Score row */}
          <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>MARCADOR</Text>
          <View style={styles.scoreRow}>
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={[styles.scoreTeamLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{match.teamHome}</Text>
              <TextInput
                value={homeScore}
                onChangeText={setHomeScore}
                keyboardType="number-pad"
                style={[styles.scoreInput, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.foreground }]}
                maxLength={2}
              />
            </View>
            <Text style={[styles.scoreDash, { color: colors.mutedForeground }]}>–</Text>
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={[styles.scoreTeamLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{match.teamAway}</Text>
              <TextInput
                value={awayScore}
                onChangeText={setAwayScore}
                keyboardType="number-pad"
                style={[styles.scoreInput, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.foreground }]}
                maxLength={2}
              />
            </View>
          </View>

          {/* Status selector */}
          <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>ESTADO</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setStatus(opt.key)}
                style={[
                  styles.statusBtn,
                  {
                    backgroundColor: status === opt.key ? `${opt.color}20` : colors.surface2,
                    borderColor: status === opt.key ? opt.color : colors.border,
                  },
                ]}
              >
                <Text style={[styles.statusBtnTxt, { color: status === opt.key ? opt.color : colors.mutedForeground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.modalBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            >
              <Text style={[styles.modalBtnTxt, { color: colors.foreground }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1.2 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.modalBtnTxt, { color: "#fff" }]}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PartidosAdminTab() {
  const colors = useColors();
  const { data: matches, isLoading } = useListMatches();
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const filtered = React.useMemo(() => {
    if (!Array.isArray(matches)) return [];
    return statusFilter === "all" ? matches : matches.filter((m) => m.status === statusFilter);
  }, [matches, statusFilter]);

  return (
    <View style={{ flex: 1 }}>
      {/* Filter pills */}
      <View style={[styles.partFilterRow, { borderBottomColor: colors.border }]}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setStatusFilter(f.key)}
            style={[
              styles.partFilterPill,
              {
                backgroundColor: statusFilter === f.key ? colors.primary : "transparent",
                borderColor: statusFilter === f.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.partFilterTxt, { color: statusFilter === f.key ? "#fff" : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: Platform.OS === "web" ? 120 : 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: ms(13) }}>
                No hay partidos en este estado
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditingMatch(item);
              }}
              activeOpacity={0.7}
              style={[styles.matchRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.matchRowLeft}>
                <View style={styles.matchTeamRow}>
                  {item.teamHomeFlagUrl ? (
                    <Image source={{ uri: item.teamHomeFlagUrl }} style={{ width: 20, height: 14, borderRadius: 2 }} contentFit="cover" />
                  ) : null}
                  <Text style={[styles.matchTeamTxt, { color: colors.foreground }]} numberOfLines={1}>{item.teamHome}</Text>
                </View>
                <Text style={[styles.matchScoreTxt, { color: colors.primary }]}>
                  {item.homeScore != null && item.awayScore != null
                    ? `${item.homeScore} – ${item.awayScore}`
                    : "vs"}
                </Text>
                <View style={styles.matchTeamRow}>
                  {item.teamAwayFlagUrl ? (
                    <Image source={{ uri: item.teamAwayFlagUrl }} style={{ width: 20, height: 14, borderRadius: 2 }} contentFit="cover" />
                  ) : null}
                  <Text style={[styles.matchTeamTxt, { color: colors.foreground }]} numberOfLines={1}>{item.teamAway}</Text>
                </View>
              </View>
              <View style={styles.matchRowRight}>
                <StatusBadge status={item.status} colors={colors} />
                <Feather name="edit-2" size={13} color={colors.mutedForeground} style={{ marginTop: 4 }} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <EditMatchModal
        match={editingMatch}
        visible={!!editingMatch}
        onClose={() => setEditingMatch(null)}
      />
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function SystemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SystemTab>("informacion");
  const [composeVisible, setComposeVisible] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const SYSTEM_TABS = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  const { markSeen, messages: allMessages } = useMessages();
  const isFocused = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      isFocused.current = true;
      markSeen();
      return () => { isFocused.current = false; };
    }, [markSeen])
  );

  React.useEffect(() => {
    if (isFocused.current) markSeen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages?.length]);

  const handleCompose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComposeVisible(true);
  };

  const handleMessageSent = () => {
    queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Feather name="settings" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sistema</Text>
          {isAdmin && activeTab !== "mensajes" && activeTab !== "apariencia" && (
            <TouchableOpacity
              style={[styles.composeHeaderBtn, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}
              onPress={handleCompose}
            >
              <Feather name="edit-3" size={13} color={colors.primary} />
              <Text style={[styles.composeHeaderBtnTxt, { color: colors.primary }]}>Redactar</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.tabRow}>
          {SYSTEM_TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[
                styles.tab,
                {
                  borderBottomWidth: 2,
                  borderBottomColor: activeTab === t.key ? colors.primary : "transparent",
                },
              ]}
            >
              <Feather
                name={t.icon as any}
                size={13}
                color={activeTab === t.key ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabText, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === "perfil" && <PerfilTab />}
      {activeTab === "mensajes" && (
        <MensajesTab
          isAdmin={isAdmin}
          onCompose={handleCompose}
        />
      )}
      {activeTab === "apariencia" && <AparienciaTab />}
      {activeTab === "informacion" && <InformacionTab />}
      {activeTab === "partidos" && isAdmin && <PartidosAdminTab />}

      <ComposeMessageModal
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        onSent={handleMessageSent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 14 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 0 },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingHorizontal: 4, paddingVertical: 10,
  },
  tabText: { fontSize: ms(11), fontFamily: "Inter_600SemiBold" },
  // Perfil
  tabContent: { padding: 20, gap: 14, paddingBottom: Platform.OS === "web" ? 120 : 100 },
  profileTop: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatarRing: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2,
  },
  adminTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ptsCard: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", gap: 10, overflow: "hidden",
  },
  ptsNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34 },
  ptsLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: -4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    flex: 1, minWidth: "28%", borderRadius: 12, borderWidth: 1, padding: 12,
    alignItems: "center", gap: 4,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  menuCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderBottomWidth: 1,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  // Compose
  composeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12,
    alignSelf: "center", marginTop: 8,
  },
  composeBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  composeHeaderBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, marginLeft: "auto",
  },
  composeHeaderBtnTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Empty
  centeredTab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40, paddingVertical: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  // Mensajes
  msgCard: { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, padding: 13, gap: 6 },
  msgHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  msgHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" },
  msgTypeBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2,
  },
  msgTypeTxt: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  msgFrom: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  adminPill: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  adminPillTxt: { fontSize: 9, fontFamily: "Inter_700Bold" },
  msgDate: { fontSize: 9, fontFamily: "Inter_400Regular", flexShrink: 0 },
  msgSubject: { fontSize: 13, fontFamily: "Inter_700Bold" },
  msgContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  // Apariencia
  modeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 14, borderWidth: 1, padding: 16,
  },
  modeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
  modeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Información — hero
  infoScroll: { paddingBottom: Platform.OS === "web" ? 120 : 100 },
  infoHero: {
    alignItems: "center", paddingHorizontal: 28, paddingTop: 28, paddingBottom: 24, gap: 4,
  },
  infoLogoWrap: {
    marginBottom: 8,
    shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12,
  },
  infoLogoGrad: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  infoLogoTxt: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 24 },
  infoCompany: {
    fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff",
    letterSpacing: 0.5, marginTop: 2,
  },
  infoSlogan: {
    fontSize: 9, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.55)", letterSpacing: 0.3, textAlign: "center",
  },
  infoDividerH: { height: 1, width: "100%", marginVertical: 0 },
  infoAppBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  infoAppBadgeTxt: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" },
  // Información — body
  infoBody: { padding: 16, gap: 16 },
  devCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, overflow: "hidden",
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  devAvatar: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  devAvatarTxt: { fontSize: 18, fontFamily: "Inter_700Bold" },
  devInfo: { flex: 1, gap: 4 },
  devName: { fontSize: ms(15), fontFamily: "Inter_700Bold" },
  devRoleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  devRole: { fontSize: ms(12), fontFamily: "Inter_500Medium" },
  devBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: "flex-start", marginTop: 2,
  },
  devBadgeTxt: { fontSize: ms(10), fontFamily: "Inter_600SemiBold" },
  infoBlock: { gap: 10 },
  infoBlockHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  infoBlockTitle: { fontSize: ms(13), fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  techChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  techChip: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  techChipTxt: { fontSize: ms(11), fontFamily: "Inter_600SemiBold" },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceItem: {
    width: "47%", borderRadius: 12, borderWidth: 1, padding: 14, gap: 8, alignItems: "flex-start",
  },
  serviceIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  serviceLabel: { fontSize: ms(12), fontFamily: "Inter_600SemiBold" },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  contactIcon: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  contactLabel: { fontSize: ms(9), fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  contactValue: { fontSize: ms(13), fontFamily: "Inter_500Medium" },
  appInfoCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  appInfoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  appInfoKey: { fontSize: ms(12), fontFamily: "Inter_500Medium" },
  appInfoVal: { fontSize: ms(13), fontFamily: "Inter_600SemiBold" },
  appInfoDivider: { height: 1 },
  infoCopyright: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4,
  },
  infoCopyrightTxt: { fontSize: ms(11), fontFamily: "Inter_500Medium", flex: 1 },
  // Partidos admin tab
  partFilterRow: {
    flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, flexWrap: "wrap",
  },
  partFilterPill: {
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
  },
  partFilterTxt: { fontSize: ms(11), fontFamily: "Inter_600SemiBold" },
  matchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 10,
  },
  matchRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  matchTeamRow: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  matchTeamTxt: { fontSize: ms(12), fontFamily: "Inter_600SemiBold", flex: 1 },
  matchScoreTxt: { fontSize: ms(14), fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "center" },
  matchRowRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  // Edit modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalBox: {
    width: "100%", maxWidth: 400, borderRadius: 18, borderWidth: 1,
    padding: 20, gap: 14,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontSize: ms(15), fontFamily: "Inter_700Bold" },
  modalTeams: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  modalTeamName: { fontSize: ms(13), fontFamily: "Inter_600SemiBold", flex: 1 },
  modalVs: { fontSize: ms(12), fontFamily: "Inter_500Medium" },
  modalLabel: { fontSize: ms(10), fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: -6 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreTeamLabel: { fontSize: ms(10), fontFamily: "Inter_500Medium", textAlign: "center" },
  scoreInput: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    fontSize: ms(22), fontFamily: "Inter_700Bold", textAlign: "center", width: "100%",
  },
  scoreDash: { fontSize: ms(22), fontFamily: "Inter_700Bold", marginTop: 18 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusBtn: {
    flex: 1, borderRadius: 8, borderWidth: 1.5,
    paddingVertical: 9, alignItems: "center",
  },
  statusBtnTxt: { fontSize: ms(11), fontFamily: "Inter_600SemiBold" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 13,
    alignItems: "center", justifyContent: "center",
  },
  modalBtnTxt: { fontSize: ms(14), fontFamily: "Inter_600SemiBold" },
});
