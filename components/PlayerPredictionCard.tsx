import type { PlayerPrediction } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { ms } from "@/utils/scale";

const PRED_DATE_COLOR = "#3b82f6";
const STATUS_LIVE     = "#ef4444";
const STATUS_DONE     = "#00d896";
const STATUS_SCHED    = "#3b82f6";

function formatMatchDateTime(matchDate: string): string {
  const d = new Date(matchDate);
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()} · ${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
}

const HN_OFFSET_MS = 6 * 60 * 60 * 1000;
function formatPredDate(dateStr: string): string {
  const d = new Date(new Date(dateStr).getTime() - HN_OFFSET_MS);
  return `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${String(d.getUTCFullYear()).slice(2)} ${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
}

function StatusChip({ status }: { status: string }) {
  const isLive     = status === "live";
  const isFinished = status === "finished";
  const color = isLive ? STATUS_LIVE : isFinished ? STATUS_DONE : STATUS_SCHED;
  const label = isLive ? "En juego" : isFinished ? "Finalizado" : "Programado";
  const pulse = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!isLive) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive, pulse]);

  return (
    <View style={[styles.statusChip, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
      {isLive && (
        <Animated.View style={[styles.liveDot, { backgroundColor: color, opacity: pulse }]} />
      )}
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function ptsConfig(pts: number | null | undefined, finished: boolean) {
  if (!finished || pts === null || pts === undefined)
    return { number: null, color: "#64748b", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.30)" };
  if (pts === 3) return { number: 3, color: "#00d896", bg: "rgba(0,216,150,0.14)",  border: "rgba(0,216,150,0.35)" };
  if (pts === 1) return { number: 1, color: "#fbbf24", bg: "rgba(251,191,36,0.14)", border: "rgba(251,191,36,0.35)" };
  return         { number: 0, color: "#ef4444", bg: "rgba(239,68,68,0.14)",  border: "rgba(239,68,68,0.35)" };
}

interface Props { item: PlayerPrediction }

export function PlayerPredictionCard({ item }: Props) {
  const colors  = useColors();
  const { match } = item;
  const finished  = match.status === "finished";
  const hasResult = finished && match.homeScore !== null && match.awayScore !== null;
  const pts       = ptsConfig(item.pointsEarned, finished);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border }]}>

      {/* Outer row: left content (85%) + right points strip (15%) */}
      <View style={styles.outerRow}>

        {/* ── LEFT CONTENT (85%) ── */}
        <View style={styles.leftContent}>

          {/* 1. Avatar + player name (top-left) + pred-date badge */}
          <View style={styles.header}>
            <View style={styles.playerRow}>
              {item.userPhotoUrl ? (
                <Image source={{ uri: item.userPhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${colors.primary}22` }]}>
                  <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                    {item.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
                {item.userName}
              </Text>
            </View>
            <View style={[styles.dateBadge, { backgroundColor: `${PRED_DATE_COLOR}15`, borderColor: `${PRED_DATE_COLOR}40` }]}>
              <Text style={[styles.dateBadgeText, { color: PRED_DATE_COLOR }]}>
                {formatPredDate(item.createdAt)}
              </Text>
            </View>
          </View>

          {/* 2. Match date/time centered */}
          <View style={styles.matchDateRow}>
            <View style={[styles.matchDTBadge, { backgroundColor: `${colors.mutedForeground}10`, borderColor: `${colors.mutedForeground}22` }]}>
              <Feather name="calendar" size={9} color={colors.mutedForeground} />
              <Text style={[styles.matchDTText, { color: colors.mutedForeground }]}>
                {formatMatchDateTime(match.matchDate)}
              </Text>
            </View>
          </View>

          {/* 4. Teams + score/VS */}
          <View style={styles.teamsRow}>
            <View style={styles.teamSide}>
              {match.teamHomeFlagUrl ? (
                <Image source={{ uri: match.teamHomeFlagUrl }} style={styles.flag} resizeMode="cover" />
              ) : null}
              <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>
                {match.teamHome}
              </Text>
            </View>
            <View style={styles.center}>
              {hasResult ? (
                <Text style={[styles.resultScore, { color: colors.foreground }]}>
                  {match.homeScore} – {match.awayScore}
                </Text>
              ) : (
                <Text style={[styles.vsText, { color: colors.mutedForeground }]}>VS</Text>
              )}
            </View>
            <View style={[styles.teamSide, styles.teamRight]}>
              {match.teamAwayFlagUrl ? (
                <Image source={{ uri: match.teamAwayFlagUrl }} style={styles.flag} resizeMode="cover" />
              ) : null}
              <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={1}>
                {match.teamAway}
              </Text>
            </View>
          </View>

          {/* 4. Match status */}
          <View style={styles.statusRow}>
            <StatusChip status={match.status} />
          </View>


        </View>

        {/* ── RIGHT STRIP — two stacked badges ── */}
        <View style={[styles.rightStrip, { borderLeftColor: pts.border }]}>
          {/* Badge 1 — points */}
          <View style={[styles.stripBadge, { backgroundColor: pts.bg, borderColor: pts.border }]}>
            <Text style={[styles.ptsNumber, { color: pts.color }]}>
              {pts.number === null ? "—" : String(pts.number)}
            </Text>
            <Text style={[styles.stripLabel, { color: pts.color }]}>Puntos</Text>
          </View>
          {/* Badge 2 — prediction */}
          <View style={[styles.stripBadge, { backgroundColor: pts.bg, borderColor: pts.border }]}>
            <Text style={[styles.stripPredScore, { color: pts.color }]}>
              {item.predictedHome} – {item.predictedAway}
            </Text>
            <Text style={[styles.stripLabel, { color: pts.color }]}>Pronóst.</Text>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 7,
    overflow: "hidden",
  },
  outerRow: {
    flexDirection: "row",
  },
  // ── Left content (85%) ──
  leftContent: {
    flex: 1,
    paddingBottom: 7,
  },
  matchDateRow: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 4,
  },
  matchDTBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  matchDTText: {
    fontSize: ms(8.5),
    fontFamily: "Inter_600SemiBold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 5,
    gap: 6,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    marginTop: 5,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: ms(9),
    fontFamily: "Inter_700Bold",
  },
  playerName: {
    fontSize: ms(10),
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  dateBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexShrink: 0,
  },
  dateBadgeText: {
    fontSize: ms(8.5),
    fontFamily: "Inter_600SemiBold",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  teamSide: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  teamRight: {
    alignItems: "center",
  },
  flag: {
    width: 30,
    height: 20,
    borderRadius: 3,
  },
  teamName: {
    fontSize: ms(8.5),
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  center: {
    alignItems: "center",
    minWidth: 52,
  },
  resultScore: {
    fontSize: ms(16),
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  vsText: {
    fontSize: ms(11),
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  statusRow: {
    alignItems: "center",
    paddingTop: 4,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: ms(8.5),
    fontFamily: "Inter_600SemiBold",
  },
  // ── Right strip — two stacked badges ──
  rightStrip: {
    width: "16%",
    borderLeftWidth: 1,
    flexDirection: "column",
    padding: 3,
    gap: 3,
  },
  stripBadge: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    gap: 1,
  },
  ptsNumber: {
    fontSize: ms(22),
    fontFamily: "Inter_700Bold",
    lineHeight: ms(26),
  },
  stripPredScore: {
    fontSize: ms(13),
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  stripLabel: {
    fontSize: ms(7),
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
