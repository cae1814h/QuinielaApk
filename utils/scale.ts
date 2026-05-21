import { Dimensions, Platform } from "react-native";

const { width: W } = Dimensions.get("window");

/** Design base width: iPhone 14 Pro logical points */
const BASE = 390;

/** -2px offset on Android so font sizes look consistent with iOS */
const ANDROID_OFFSET = Platform.OS === "android" ? -2 : 0;

/**
 * Scales a value proportionally to the screen width.
 * Good for image / icon dimensions.
 */
export const sc = (size: number): number => (W / BASE) * size;

/**
 * Moderately scales a value to screen width.
 * Good for font sizes — grows with the screen but not aggressively.
 * factor=0 → no scaling; factor=1 → full proportional.
 * Default factor 0.35 keeps sizes mostly consistent across devices.
 */
export const ms = (size: number, factor = 0.35): number =>
  size + (sc(size) - size) * factor + ANDROID_OFFSET;
