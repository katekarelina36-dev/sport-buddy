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
  // Same ngrok free-tier interstitial workaround as api/client.ts — Image
  // loads look like an anonymous browser visit without this header.
  return <Image source={{ uri, headers: { "ngrok-skip-browser-warning": "true" } }} style={dimensionStyle} />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.sageLight },
});
