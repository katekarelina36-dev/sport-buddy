import { Image, View, StyleSheet } from "react-native";
import { colors } from "../theme";
import { API_BASE_URL } from "../api/client";

interface Props {
  photoUrl?: string | null;
  size?: number;
}

export function Avatar({ photoUrl, size = 44 }: Props) {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };
  if (!photoUrl) return <View style={[styles.placeholder, dimensionStyle]} />;
  const uri = photoUrl.startsWith("http") ? photoUrl : `${API_BASE_URL}${photoUrl}`;
  return <Image source={{ uri }} style={dimensionStyle} />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.sageLight },
});
