import { Pressable, Text, StyleSheet, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { resolveMediaUrl } from "../api/client";
import { colors, typography } from "../theme";

interface Props {
  name: string;
  photoUrl?: string | null;
  localImage?: ImageSourcePropType;
  roundedTop?: boolean;
  onPress: () => void;
}

export const ACTIVITY_CARD_HEIGHT = 140;

const OVERLAY_TINT = "#003161";

// Full-width photo row for the Explore Activity screen (per the Figma card
// redesign): a visible photo with a translucent brand-tinted wash on top
// (same idea as the Communities list card — see CardOverlay there — so a
// loaded photo actually shows), bold centered label. Only the very first
// card in the list gets rounded top corners — every other corner on every
// card is square, so the stack reads as one continuous strip rather than
// individual tiles.
// The photo comes from Activity.iconUrl (downloaded from Unsplash once and
// stored via the media pipeline — see apps/api/scripts/downloadSportImages.ts
// — never fetched from Unsplash at runtime); `localImage` is a bundled
// fallback for a sport the pipeline hasn't picked up a photo for yet (e.g.
// Padel). A sport with neither falls back to a flat brand-gradient tile.
//
// The wash on top of the photo is a radial vignette (heavier at the
// vertically-centered title, lighter toward the card edges) rather than a
// flat overlay — a flat wash at any opacity high enough to guarantee title
// contrast also crushes the photo everywhere else. RN has no cross-platform
// `mix-blend-mode`, so this is the "plain layered overlay" fallback: an
// SVG radial gradient in the overlay's own color/opacity, alpha-composited
// over the photo (per-card gradient id to avoid RNSVG id collisions across
// sibling cards in the same list).
export function ActivityCard({ name, photoUrl, localImage, roundedTop, onPress }: Props) {
  const uri = resolveMediaUrl(photoUrl);
  const source: ImageSourcePropType | undefined = uri ? { uri } : localImage;
  const gradientId = `cardVignette-${name}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={[styles.card, roundedTop && styles.roundedTop]}
    >
      {source ? (
        <Image source={source} style={[StyleSheet.absoluteFill, styles.photo]} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={[colors.coral, colors.sageDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" rx="45%" ry="30%">
            <Stop offset="0%" stopColor={OVERLAY_TINT} stopOpacity={0.16} />
            <Stop offset="50%" stopColor={OVERLAY_TINT} stopOpacity={0.112} />
            <Stop offset="100%" stopColor={OVERLAY_TINT} stopOpacity={0.064} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      <Text style={styles.label}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: ACTIVITY_CARD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 0,
  },
  roundedTop: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  photo: { opacity: 0.1 },
  label: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 40,
    color: colors.textOnDark,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
