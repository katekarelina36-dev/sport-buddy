import { Pressable, Text, StyleSheet, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { resolveMediaUrl } from "../api/client";
import { colors, spacing, typography } from "../theme";

type FocalPoint = { top: string; left: string };

interface Props {
  name: string;
  photoUrl?: string | null;
  localImage?: ImageSourcePropType;
  // Overrides the default centered crop — needed when the photo's
  // busy subject (racket, ball, player) would otherwise land under the
  // bottom-left title.
  imageFocalPoint?: FocalPoint;
  roundedTop?: boolean;
  onPress: () => void;
}

const DEFAULT_FOCAL_POINT: FocalPoint = { top: "50%", left: "50%" };

export const ACTIVITY_CARD_HEIGHT = 140;

// Full-width photo row for the Explore Activity screen. The photo is shown
// at full opacity/clarity — no whole-card darkening — with the activity
// name bottom-left per the redesign spec, and only a *localized* bottom
// scrim (not a full-card wash) behind the text for contrast. `localImage`
// takes priority over the server-provided Activity.iconUrl (see
// apps/api/scripts/downloadSportImages.ts) because this screen's six cards
// need a specific, curated composition — bottom-left third clear of the
// photo's main subject — that a randomly-fetched photo can't guarantee. A
// sport with neither photo falls back to a flat brand-gradient tile. Only
// the very first card in the list gets rounded top corners — every other
// corner on every card is square, so the stack reads as one continuous
// strip rather than individual tiles.
export function ActivityCard({ name, photoUrl, localImage, imageFocalPoint, roundedTop, onPress }: Props) {
  const uri = resolveMediaUrl(photoUrl);
  const source: ImageSourcePropType | undefined = localImage ?? (uri ? { uri } : undefined);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={[styles.card, roundedTop && styles.roundedTop]}
    >
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={imageFocalPoint ?? DEFAULT_FOCAL_POINT}
        />
      ) : (
        <LinearGradient
          colors={[colors.coral, colors.sageDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.55)"]}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bottomScrim}
        pointerEvents="none"
      />
      <Text style={styles.label}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: ACTIVITY_CARD_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
    overflow: "hidden",
    borderRadius: 0,
  },
  roundedTop: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  // Only the bottom ~60% of the card, fading to fully transparent above
  // that — the rest of the photo is left untouched, per spec.
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  label: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 40,
    color: colors.textOnDark,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
