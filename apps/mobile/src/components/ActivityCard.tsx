import { Pressable, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { resolveMediaUrl } from "../api/client";
import { colors, typography } from "../theme";

interface Props {
  name: string;
  photoUrl?: string | null;
  roundedTop?: boolean;
  onPress: () => void;
}

export const ACTIVITY_CARD_HEIGHT = 140;

// Full-width photo row for the Explore Activity screen (per the Figma card
// redesign): a visible photo with a translucent brand-tinted wash on top
// (same idea as the Communities list card — see CardOverlay there — so a
// loaded photo actually shows), bold centered label. Only the very first
// card in the list gets rounded top corners — every other corner on every
// card is square, so the stack reads as one continuous strip rather than
// individual tiles.
// The photo comes from Activity.iconUrl (downloaded from Unsplash once and
// stored via the media pipeline — see apps/api/scripts/downloadSportImages.ts
// — never fetched from Unsplash at runtime); a sport with no photo yet falls
// back to a flat brand-gradient tile.
//
// A previous version drew the photo at 20% opacity *and* topped it with a
// gradient starting at a fully-OPAQUE offWhite — opaque-over-faint hid the
// photo almost entirely, which read as "images not loading" even though the
// URL resolved fine. Fixed by keeping the photo at full opacity and starting
// the wash gradient fully transparent, matching the Communities card.
export function ActivityCard({ name, photoUrl, roundedTop, onPress }: Props) {
  const uri = resolveMediaUrl(photoUrl);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={[styles.card, roundedTop && styles.roundedTop]}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={[colors.coral, colors.sageDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={["transparent", `${colors.coral}CC`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
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
  label: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 20,
    color: colors.textOnDark,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
