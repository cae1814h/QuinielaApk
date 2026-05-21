import { Feather } from "@expo/vector-icons";
import {
  useListMatches,
  useListMyPredictions,
  useListAllPredictions,
  getListMyPredictionsQueryKey,
  getListAllPredictionsQueryKey,
} from "@workspace/api-client-react";
import type { Match, PredictionWithMatch, PlayerPrediction } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatchCard } from "@/components/MatchCard";
import { PlayerPredictionCard } from "@/components/PlayerPredictionCard";
import { SkeletonMatchCard, SkeletonPlayerCard } from "@/components/SkeletonCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getTodayHN, getTomorrowHN, matchDayStr, matchInWeekHN } from "@/utils/dateHN";
import { ms } from "@/utils/scale";

type OuterTab = "realizados" | "pendientes" | "jugadores";
type TimeFilter = "todo" | "hoy" | "manana" | "semana";
type FeatherName = React.ComponentProps<typeof Feather>["name"];

function matchInTimeRange(matchDate: string, filter: TimeFilter): boolean {
  if (filter === "todo") return true;
  const day = matchDayStr(matchDate);
  if (filter === "hoy") return day === getTodayHN();
  if (filter === "manana") return day === getTomorrowHN();
  return matchInWeekHN(matchDate);
}

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "manana", label: "Mañana" },
  { key: "semana", label: "Semana" },
  { key: "todo", label: "Todo" },
];

const OUTER_TABS: { key: OuterTab; label: string; icon: FeatherName }[] = [
  { key: "realizados", label: "Realizados", icon: "check-circle" },
  { key: "pendientes", label: "Pendientes", icon: "clock" },
  { key: "jugadores",  label: "Jugadores",  icon: "users" },
];

export default function PredictionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [outerTab, setOuterTab] = useState<OuterTab>("realizados");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("todo");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [searchMatch, setSearchMatch]   = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: matches, isLoading: loadingMatches, refetch: refetchMatches } = useListMatches();
  const { data: predictions, isLoading: loadingPreds, refetch: refetchPreds } = useListMyPredictions({
    query: { enabled: !!token, queryKey: getListMyPredictionsQueryKey() },
  });
  const {
    data: allPredictions,
    isLoading: loadingAll,
    isError: errorAll,
    error: allError,
    refetch: refetchAll,
  } = useListAllPredictions({
    query: {
      enabled: !!token,
      queryKey: getListAllPredictionsQueryKey(),
      refetchOnMount: "always",
    },
  });

  const predsByMatchId = useMemo(() => {
    const map = new Map<number, PredictionWithMatch>();
    (predictions ?? []).forEach((p) => map.set(p.matchId, p));
    return map;
  }, [predictions]);

  const filtered = useMemo(() => {
    if (!matches) return [];
    if (outerTab === "realizados") {
      return matches.filter((m) =>
        predsByMatchId.has(m.id) && matchInTimeRange(m.matchDate, timeFilter)
      );
    }
    if (outerTab === "pendientes") {
      return matches.filter((m) =>
        !predsByMatchId.has(m.id) &&
        m.status === "scheduled" &&
        matchInTimeRange(m.matchDate, timeFilter)
      );
    }
    return [];
  }, [matches, outerTab, timeFilter, predsByMatchId]);

  const filteredAll = useMemo((): PlayerPrediction[] => {
    if (!allPredictions) return [];
    const playerQ = searchPlayer.toLowerCase().trim();
    const matchQ  = searchMatch.toLowerCase().trim();
    return allPredictions.filter((p) => {
      if (!matchInTimeRange(p.match.matchDate, timeFilter)) return false;
      if (playerQ && !p.userName.toLowerCase().includes(playerQ)) return false;
      if (matchQ) {
        // Normalize: remove separators (vs, vrs, contra, -), collapse spaces
        const stripped = matchQ.replace(/\b(vrs?|contra)\b/g, " ").replace(/[-]/g, " ").replace(/\s+/g, " ").trim();
        const home = p.match.teamHome.toLowerCase();
        const away = p.match.teamAway.toLowerCase();
        const combined = `${home} ${away}`;
        // All words must appear somewhere in the combined team string
        const words = stripped.split(" ").filter(w => w.length > 0);
        const allWordsMatch = words.every(w => combined.includes(w));
        // Also try without spaces: "BrasilMexico" → "brasilmexico" ∈ "brasilmexico"
        const noSpaceQuery   = stripped.replace(/\s/g, "");
        const noSpaceCombined = combined.replace(/\s/g, "");
        const noSpaceMatch = noSpaceQuery.length > 2 && noSpaceCombined.includes(noSpaceQuery);
        if (!allWordsMatch && !noSpaceMatch) return false;
      }
      return true;
    });
  }, [allPredictions, timeFilter, searchPlayer, searchMatch]);

  const isLoadingMy  = loadingMatches || loadingPreds;

  const handleRefresh = async () => {
    if (outerTab === "jugadores") {
      await refetchAll();
    } else {
      await Promise.all([refetchMatches(), refetchPreds()]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Feather name="crosshair" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pronósticos</Text>
        </View>

        {/* Outer tabs */}
        <View style={styles.outerTabBar}>
          {OUTER_TABS.map((tab) => {
            const active = outerTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setOuterTab(tab.key)}
                style={[
                  styles.outerTab,
                  {
                    borderBottomWidth: 2,
                    borderBottomColor: active ? colors.primary : "transparent",
                    paddingBottom: 10,
                  },
                ]}
              >
                <Feather
                  name={tab.icon}
                  size={12}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <Text style={[
                  styles.outerTabText,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time filters */}
        <View style={styles.timeFilterRow}>
          {TIME_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setTimeFilter(f.key)}
              style={[
                styles.pill,
                {
                  borderColor: timeFilter === f.key ? colors.primary : "transparent",
                  backgroundColor: timeFilter === f.key
                    ? `${colors.primary}22`
                    : colors.surface2,
                },
              ]}
            >
              <Text style={[
                styles.pillText,
                { color: timeFilter === f.key ? colors.primary : colors.mutedForeground },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search filters — only in Jugadores tab */}
        {outerTab === "jugadores" && (
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Feather name="user" size={13} color={colors.mutedForeground} />
              <TextInput
                placeholder="Buscar jugador…"
                placeholderTextColor={colors.mutedForeground}
                value={searchPlayer}
                onChangeText={setSearchPlayer}
                style={[styles.searchInput, { color: colors.foreground }]}
                autoCapitalize="none"
              />
              {searchPlayer.length > 0 && (
                <TouchableOpacity onPress={() => setSearchPlayer("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Feather name="flag" size={13} color={colors.mutedForeground} />
              <TextInput
                placeholder="Buscar partido…"
                placeholderTextColor={colors.mutedForeground}
                value={searchMatch}
                onChangeText={setSearchMatch}
                style={[styles.searchInput, { color: colors.foreground }]}
                autoCapitalize="none"
              />
              {searchMatch.length > 0 && (
                <TouchableOpacity onPress={() => setSearchMatch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {outerTab === "jugadores" ? (
        errorAll ? (
          <View style={styles.empty}>
            <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Error al cargar</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {(allError as Error)?.message ?? "No se pudieron obtener los pronósticos."}
            </Text>
            <TouchableOpacity
              onPress={() => { void refetchAll(); }}
              style={[styles.retryBtn, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` }]}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.retryText, { color: colors.primary }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <FlatList<PlayerPrediction | null>
          data={loadingAll ? (Array(5).fill(null) as null[]) : filteredAll}
          keyExtractor={(item, i) => item ? String(item.id) : `sk-${i}`}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !loadingAll ? (
              <View style={styles.empty}>
                <Feather name="users" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {searchPlayer || searchMatch ? "Sin resultados" : "Sin pronósticos"}
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {searchPlayer || searchMatch
                    ? "Prueba con otro término de búsqueda"
                    : "Los pronósticos de otros jugadores se muestran solo cuando el partido está en curso o finalizado"}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item === null ? <SkeletonPlayerCard /> : <PlayerPredictionCard item={item} />
          }
        />
        )
      ) : (
        <FlatList<Match | null>
          data={isLoadingMy ? (Array(4).fill(null) as null[]) : filtered}
          keyExtractor={(item, i) => item ? String((item as Match).id) : `sk-${i}`}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !isLoadingMy ? (
              <View style={styles.empty}>
                <Feather
                  name={outerTab === "pendientes" ? "check-circle" : "crosshair"}
                  size={36}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {outerTab === "pendientes"
                    ? "Sin partidos pendientes"
                    : "Sin pronósticos en este período"}
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {outerTab === "pendientes"
                    ? "¡Ya pronosticaste todos los partidos!"
                    : "Cambia el filtro de tiempo o ve a Pendientes para pronosticar"}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item === null ? (
              <SkeletonMatchCard />
            ) : (
              <MatchCard
                match={item as Match}
                prediction={predsByMatchId.get((item as Match).id)}
                onPress={() => router.push(`/match/${(item as Match).id}`)}
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 0, borderBottomWidth: 1, gap: 0 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  headerTitle: { fontSize: ms(20), fontFamily: "Inter_700Bold" },
  outerTabBar: { flexDirection: "row", gap: 0 },
  outerTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
  },
  outerTabText: { fontSize: ms(11), fontFamily: "Inter_600SemiBold" },
  timeFilterRow: { flexDirection: "row", gap: 6, paddingTop: 12, paddingBottom: 12 },
  pill: {
    flex: 1, paddingVertical: 7, borderRadius: 4, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  pillText: { fontSize: ms(10), fontFamily: "Inter_600SemiBold" },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: ms(11),
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: ms(16), fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: ms(13), fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: ms(20) },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, marginTop: 4,
  },
  retryText: { fontSize: ms(13), fontFamily: "Inter_600SemiBold" },
});
