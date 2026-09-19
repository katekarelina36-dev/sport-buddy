import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, uploadPhoto } from "../../../src/api/client";
import { ActivityIcon } from "../../../src/components/icons/ActivityIcon";
import { colors, spacing, typography, radii } from "../../../src/theme";
import type { CommunitySummary } from "../../../src/api/types";

// Communities — Edit Community screen (organiser only). Sport can't be
// changed after creation; only name, photo, and description are editable.
export default function EditCommunityScreen() {
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<CommunitySummary>(`/communities/${communityId}`).then((c) => {
      setName(c.name);
      setDescription(c.description ?? "");
      setPhotoUrl(c.photoUrl);
      setPhotoUri(c.photoUrl);
      setLoaded(true);
    });
  }, [communityId]);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to change the community photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    setUploadingPhoto(true);
    try {
      const { photoUrl: url } = await uploadPhoto(result.assets[0].uri, "/communities/photo");
      setPhotoUrl(url);
      setPhotoUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert("Couldn't upload photo", (err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function confirmDiscard() {
    Alert.alert("Discard changes?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }

  const canSave = name.trim().length > 0;

  async function save() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      await api.patch(`/communities/${communityId}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        photoUrl: photoUrl ?? undefined,
      });
      router.back();
    } catch (err) {
      Alert.alert("Couldn't save changes", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <Pressable onPress={confirmDiscard}>
          <Text style={styles.headerButtonLeft}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Community</Text>
        <Pressable onPress={save} disabled={!canSave || submitting}>
          <Text style={[styles.headerButtonRight, (!canSave || submitting) && styles.headerButtonDisabled]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.photoCircle} onPress={pickPhoto} disabled={uploadingPhoto}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoImage} /> : <ActivityIcon name="" size={28} />}
        </Pressable>
        <Text style={styles.addPhotoLabel} onPress={pickPhoto}>
          {uploadingPhoto ? "Uploading…" : "Change photo"}
        </Text>

        <Text style={styles.label}>Community name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={(t) => setName(t.slice(0, 50))} maxLength={50} />
        <Text style={styles.counter}>{name.length}/50</Text>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 300))}
          multiline
          maxLength={300}
        />
        <Text style={styles.counter}>{description.length}/300</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
  headerButtonLeft: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.coral },
  headerButtonRight: { fontFamily: typography.fontFamily, fontSize: 15, color: colors.coral },
  headerButtonDisabled: { opacity: 0.4 },
  headerTitle: { fontFamily: typography.fontFamilyBold, fontSize: 17, color: colors.charcoal },
  content: { padding: spacing.lg, paddingBottom: 80 },
  photoCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#F1F5F9", alignSelf: "center", alignItems: "center", justifyContent: "center", overflow: "hidden", marginTop: spacing.lg },
  photoImage: { width: "100%", height: "100%" },
  addPhotoLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.coral, textAlign: "center", marginTop: spacing.sm },
  label: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal, marginTop: spacing.lg },
  input: { backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 52, fontFamily: typography.fontFamilyRegular, fontSize: 16, color: colors.charcoal, marginTop: spacing.sm },
  counter: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 },
  textArea: { backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 100, fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal, marginTop: spacing.sm, textAlignVertical: "top" },
});
