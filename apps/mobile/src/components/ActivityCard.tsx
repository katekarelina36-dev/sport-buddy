import { Pressable, Text, View, StyleSheet } from "react-native";
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

export const ACTIVITY_CARD_HEIGHT = 92;

// Full-width photo row for the Explore Activity screen (per the Figma card
// redesign): photo at 20% opacity + a heavy blur, a top→bottom gradient
// wash on top, bold centered label. Only the very first card in the list
// gets rounded top corners — every other corner on every card is square, so
// the stack reads as one continuous strip rather than individual tiles.
// The photo comes from Activity.iconUrl (downloaded from Unsplash once and
// stored via the media pipeline — see apps/api/scripts/downloadSportImages.ts
// — never fetched from Unsplash at runtime); a sport with no photo yet falls
// back to a flat brand-gradient tile.
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
        <Image source={{ uri }} style={[StyleSheet.absoluteFill, styles.photo]} contentFit="cover" blurRadius={50} />
      ) : (
        <LinearGradient
          colors={[colors.coral, colors.sageDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={[colors.offWhite, `${colors.coral}66`]}
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
  photo: { opacity: 0.2 },
  label: { fontFamily: typography.fontFamilyBold, fontSize: 20, color: colors.charcoal },
});
