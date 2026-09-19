import { Pressable, Text, View, StyleSheet, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "../theme";

interface Props {
  name: string;
  image?: ImageSourcePropType;
  tint: string;
  roundedTop?: boolean;
  onPress: () => void;
}

export const ACTIVITY_CARD_HEIGHT = 92;

// Full-width photo row for the Explore Activity screen (per the Figma card
// redesign): photo at 20% opacity + a heavy blur, a top→bottom gradient
// wash on top, bold centered label. Only the very first card in the list
// gets rounded top corners — every other corner on every card is square, so
// the stack reads as one continuous strip rather than individual tiles.
export function ActivityCard({ name, image, tint, roundedTop, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={[styles.card, roundedTop && styles.roundedTop]}
    >
      {image ? (
        <Image source={image} style={[StyleSheet.absoluteFill, styles.photo]} contentFit="cover" blurRadius={50} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.photo, { backgroundColor: tint }]} />
      )}
      <LinearGradient
        colors={["#EDECEF", "#1907A766"]}
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
