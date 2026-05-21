import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const NAVY  = "#0A1628";
const GOLD  = "#FFD700";
const GREEN = "#22c55e";
const RED   = "#DC2626";
const WHITE = "#FFFFFF";

const BALL_SIZE  = W * 0.18;
const RING_BASE  = W;

const LETTERS = "QUINIELA".split("");

const TOTAL_MS = 5500;

export function SplashLoader() {
  // Scene 1+2: line
  const lineScaleX   = useRef(new Animated.Value(0)).current;

  // Scene 2: shockwave rings
  const ring1Scale   = useRef(new Animated.Value(0)).current;
  const ring1Opacity = useRef(new Animated.Value(1)).current;
  const ring2Scale   = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(1)).current;

  // Scene 2: ball
  const ballScale   = useRef(new Animated.Value(0)).current;
  const ballOpacity = useRef(new Animated.Value(0)).current;

  // Scene 3: QUINIELA per-letter
  const letterOp = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const letterY  = useRef(LETTERS.map(() => new Animated.Value(22))).current;

  // Scene 4: MUNDIAL 2026 + flash
  const mundialOp    = useRef(new Animated.Value(0)).current;
  const mundialScale = useRef(new Animated.Value(1.8)).current;
  const flashOp      = useRef(new Animated.Value(0)).current;

  // Scene 5: sparkle ring + lockup fade
  const sparkleScale = useRef(new Animated.Value(0)).current;
  const sparkleOp    = useRef(new Animated.Value(0)).current;
  const lockupOp     = useRef(new Animated.Value(1)).current;
  const lockupScale  = useRef(new Animated.Value(1)).current;

  // Root fade-out
  const rootOp = useRef(new Animated.Value(1)).current;

  // Progress bar (0 → 1 over TOTAL_MS) — JS driver for width
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Percentage counter state
  const [percent, setPercent] = useState(0);

  // Credit opacity
  const creditOp = useRef(new Animated.Value(0)).current;
  const creditY  = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Track progress for percentage label
    const listenerId = progressAnim.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });

    // ── Progress bar fills over full animation duration ───────────────
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: TOTAL_MS,
      delay: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // ── Scene 1 (0–800ms): line draws in ──────────────────────────────
    Animated.timing(lineScaleX, {
      toValue: 1, duration: 500, delay: 100,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    // ── Scene 2 (800–2000ms): ball explosion ──────────────────────────
    const t2 = setTimeout(() => {
      Animated.timing(lineScaleX, {
        toValue: 0, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }).start();
      Animated.parallel([
        Animated.timing(ring1Scale,   { toValue: 2.5, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0,   duration: 800, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(ring2Scale,   { toValue: 1.8, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0,   duration: 700, useNativeDriver: true }),
        ]),
      ]).start();
      Animated.parallel([
        Animated.timing(ballOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(ballScale, { toValue: 1, friction: 7, tension: 350, useNativeDriver: true }),
      ]).start();
    }, 800);

    // ── Scene 3 (2000–3000ms): QUINIELA stagger ───────────────────────
    const t3 = setTimeout(() => {
      Animated.timing(ballOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      LETTERS.forEach((_, i) => {
        Animated.sequence([
          Animated.delay(i * 55),
          Animated.parallel([
            Animated.spring(letterY[i],  { toValue: 0, friction: 9, tension: 350, useNativeDriver: true }),
            Animated.timing(letterOp[i], { toValue: 1, duration: 180, useNativeDriver: true }),
          ]),
        ]).start();
      });
    }, 2000);

    // ── Scene 4 (3000–3700ms): MUNDIAL 2026 ───────────────────────────
    const t4 = setTimeout(() => {
      Animated.parallel([
        Animated.spring(mundialScale, { toValue: 1, friction: 7, tension: 300, useNativeDriver: true }),
        Animated.timing(mundialOp,    { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(flashOp, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 3000);

    // ── Credit (3600ms) ────────────────────────────────────────────────
    const tCredit = setTimeout(() => {
      Animated.parallel([
        Animated.timing(creditOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(creditY,  { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 3600);

    // ── Scene 5 (3700–5000ms): sparkle + fade ─────────────────────────
    const t5 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(sparkleOp,    { toValue: 1,   duration: 100, useNativeDriver: true }),
        Animated.timing(sparkleScale, { toValue: 1.5, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(sparkleOp, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(lockupOp,    { toValue: 0,    duration: 500, useNativeDriver: true }),
          Animated.timing(lockupScale, { toValue: 0.85, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }, 3700);

    // ── Fade to black (5000ms) ─────────────────────────────────────────
    const t6 = setTimeout(() => {
      Animated.timing(rootOp, { toValue: 0, duration: 700, useNativeDriver: true }).start();
    }, 5000);

    return () => {
      progressAnim.removeListener(listenerId);
      [t2, t3, t4, t5, t6, tCredit].forEach(clearTimeout);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[s.root, { opacity: rootOp }]}>
      <Animated.View style={s.bgGlow} />

      {/* Line */}
      <Animated.View style={[s.line, { transform: [{ scaleX: lineScaleX }] }]} />

      {/* Gold shockwave ring */}
      <Animated.View style={[s.ringGold, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />

      {/* Red shockwave ring */}
      <Animated.View style={[s.ringRed, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />

      {/* Ball */}
      <Animated.View style={[s.ball, { opacity: ballOpacity, transform: [{ scale: ballScale }] }]}>
        <Animated.View style={s.ballInner} />
      </Animated.View>

      {/* Sparkle ring */}
      <Animated.View style={[s.sparkleRing, { opacity: sparkleOp, transform: [{ scale: sparkleScale }] }]} />

      {/* Crimson flash */}
      <Animated.View style={[s.flash, { opacity: flashOp }]} pointerEvents="none" />

      {/* Lockup: QUINIELA + MUNDIAL 2026 */}
      <Animated.View style={[s.lockup, { opacity: lockupOp, transform: [{ scale: lockupScale }] }]}>
        <Animated.View style={s.lettersRow}>
          {LETTERS.map((char, i) => (
            <Animated.Text
              key={i}
              style={[s.letter, { opacity: letterOp[i], transform: [{ translateY: letterY[i] }] }]}
            >
              {char}
            </Animated.Text>
          ))}
        </Animated.View>
        <Animated.Text style={[s.mundial, { opacity: mundialOp, transform: [{ scale: mundialScale }] }]}>
          MUNDIAL 2026
        </Animated.Text>
      </Animated.View>

      {/* Bottom area: credit + progress bar */}
      <View style={s.bottomArea}>

        {/* Credit line */}
        <Animated.View style={[s.creditRow, { opacity: creditOp, transform: [{ translateY: creditY }] }]}>
          <Text style={s.credit}>Desarrollo por Sisyserint.com HN </Text>
          <Text style={s.flag}>🇭🇳</Text>
        </Animated.View>

        {/* Progress bar + percentage */}
        <View style={s.progressWrapper}>
          {/* Percentage label */}
          <Text style={s.percentLabel}>{percent}%</Text>

          {/* Track */}
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]} />
          </View>
        </View>

      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bgGlow: {
    position: "absolute",
    width: W * 1.4,
    height: W * 1.4,
    borderRadius: W * 0.7,
    backgroundColor: "#0F223D",
    opacity: 0.8,
  },
  line: {
    position: "absolute",
    height: 2,
    left: 0,
    right: 0,
    top: H / 2 - 1,
    backgroundColor: WHITE,
  },
  ringGold: {
    position: "absolute",
    width: RING_BASE,
    height: RING_BASE,
    borderRadius: RING_BASE / 2,
    borderWidth: 2,
    borderColor: GOLD,
    left: W / 2 - RING_BASE / 2,
    top: H / 2 - RING_BASE / 2,
  },
  ringRed: {
    position: "absolute",
    width: RING_BASE * 0.85,
    height: RING_BASE * 0.85,
    borderRadius: RING_BASE * 0.425,
    borderWidth: 1,
    borderColor: RED,
    left: W / 2 - RING_BASE * 0.425,
    top: H / 2 - RING_BASE * 0.425,
  },
  ball: {
    position: "absolute",
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: WHITE,
    left: W / 2 - BALL_SIZE / 2,
    top: H / 2 - BALL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
  },
  ballInner: {
    width: BALL_SIZE * 0.68,
    height: BALL_SIZE * 0.68,
    borderRadius: BALL_SIZE * 0.34,
    borderWidth: 3,
    borderColor: NAVY,
    opacity: 0.3,
  },
  sparkleRing: {
    position: "absolute",
    width: W * 0.85,
    height: W * 0.85,
    borderRadius: W * 0.425,
    borderWidth: 2,
    borderColor: GOLD,
    left: W / 2 - W * 0.425,
    top: H / 2 - W * 0.425,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RED,
  },
  lockup: {
    alignItems: "center",
  },
  lettersRow: {
    flexDirection: "row",
  },
  letter: {
    fontSize: W * 0.155,
    fontWeight: "900",
    color: WHITE,
    lineHeight: W * 0.19,
  },
  mundial: {
    fontSize: W * 0.062,
    fontWeight: "700",
    fontStyle: "italic",
    color: GOLD,
    lineHeight: W * 0.082,
    marginTop: -2,
    letterSpacing: 2,
  },

  // ── Bottom area ───────────────────────────────────────────────────────
  bottomArea: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 28,
    rowGap: 10,
  },
  creditRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  credit: {
    fontSize: W * 0.033,
    color: "rgba(255,215,0,0.6)",
    letterSpacing: 0.5,
    fontWeight: "500",
  },
  flag: {
    fontSize: W * 0.038,
  },

  // ── Progress bar ──────────────────────────────────────────────────────
  progressWrapper: {
    width: "100%",
    alignItems: "center",
    rowGap: 6,
  },
  percentLabel: {
    fontSize: W * 0.036,
    fontWeight: "700",
    color: GREEN,
    letterSpacing: 1,
  },
  progressTrack: {
    width: "100%",
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: GREEN,
  },
});
