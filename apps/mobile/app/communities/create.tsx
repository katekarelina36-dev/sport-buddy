import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, uploadPhoto } from "../../src/api/client";
import { useAuth } from "../../src/hooks/useAuth";
import { Avatar } from "../../src/components/Avatar";
import { colors, spacing, typography, radii } from "../../src/theme";
import type { Activity, CommunitySummary, PublicUser } from "../../src/api/types";

// Communities — Create Community screen. Sport is scoped to what the user has
// actually completed Events in (see GET /training/completed-sports); "Invite
// members" lists everyone the user has at least one completed Event with.
export default function CreateCommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [sports, setSports] = useState<Activity[]>([]);
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [playedWith, setPlayedWith] = useState<PublicUser[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Activity[]>("/training/completed-sports").then((list) => {
      setSports(list);
      if (list.length === 1) setSelectedSportId(list[0].id);
    });
    api.get<PublicUser[]>("/users/played-with").then(setPlayedWith);
  }, []);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add a community photo.");
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

  function toggleInvite(userId: string) {
    setInvitedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function confirmDiscard() {
    Alert.alert("Discard changes?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }

  const canCreate = name.trim().length > 0 && Boolean(selectedSportId);

  async function create() {
    if (!canCreate || !selectedSportId) return;
    setSubmitting(true);
    try {
      const community = await api.post<CommunitySummary>("/communities", {
        name: name.trim(),
        activityId: selectedSportId,
        photoUrl: photoUrl ?? undefined,
        description: description.trim() || undefined,
        invitedUserIds: Array.from(invitedIds),
      });
      await refresh();
      router.replace(`/communities/${community.id}`);
    } catch (err) {
      Alert.alert("Couldn't create community", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <Pressable onPress={confirmDiscard}>
          <Text style={styles.headerButtonLeft}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create Community</Text>
        <Pressable onPress={create} disabled={!canCreate || submitting}>
          <Text style={[styles.headerButtonRight, (!canCreate || submitting) && styles.headerButtonDisabled]}>Create</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.photoCircle} onPress={pickPhoto} disabled={uploadingPhoto}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoImage} /> : <Text style={styles.photoIcon}>{uploadingPhoto ? "…" : "📷"}</Text>}
        </Pressable>
        <Text style={styles.addPhotoLabel} onPress={pickPhoto}>
          {uploadingPhoto ? "Uploading…" : "Add photo"}
        </Text>

        <Text style={styles.label}>Community name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Warsaw Tennis Club"
          value={name}
          onChangeText={(t) => setName(t.slice(0, 50))}
          maxLength={50}
        />
        <Text style={styles.counter}>{name.length}/50</Text>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Sport *</Text>
        {sports.length === 0 ? (
          <Text style={styles.helperText}>Complete an event first to unlock a sport to organize around.</Text>
        ) : sports.length === 1 ? (
          <View style={[styles.sportPill, styles.sportPillSelected, { alignSelf: "flex-start" }]}>
            <Text style={styles.sportPillLabelSelected}>{sports[0].name}</Text>
          </View>
        ) : (
          <View style={styles.sportRow}>
            {sports.map((s) => {
              const selected = selectedSportId === s.id;
              return (
                <Pressable key={s.id} style={[styles.sportPill, selected && styles.sportPillSelected]} onPress={() => setSelectedSportId(s.id)}>
                  <Text style={selected ? styles.sportPillLabelSelected : styles.sportPillLabel}>{s.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.label, { marginTop: spacing.md }]}>Description</Text>
        <Text style={styles.helperText}>Tell people what your community is about</Text>
        <TextInput
          style={styles.textArea}
          placeholder="We meet every week to play tennis in Warsaw..."
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 300))}
          multiline
          maxLength={300}
        />
        <Text style={styles.counter}>{description.length}/300</Text>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Invite members</Text>
        <Text style={styles.helperText}>Invite people you've already played with</Text>
        {playedWith.length === 0 ? (
          <Text style={styles.emptyInvite}>Play with others first to invite them here</Text>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
            {playedWith.map((u) => {
              const invited = invitedIds.has(u.id);
              return (
                <View key={u.id} style={styles.inviteRow}>
                  <Avatar photoUrl={u.profile?.photoUrl} size={36} />
                  <Text style={styles.inviteName}>{u.profile?.displayName ?? "Sport Buddy user"}</Text>
                  <Pressable
                    style={[styles.inviteButton, invited && styles.inviteButtonInvited]}
                    onPress={() => toggleInvite(u.id)}
                    disabled={invited}
                  >
                    <Text style={[styles.inviteButtonLabel, invited && styles.inviteButtonLabelInvited]}>{invited ? "Invited" : "Invite"}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable style={[styles.submitButton, (!canCreate || submitting) && styles.submitButtonDisabled]} disabled={!canCreate || submitting} onPress={create}>
          <Text style={[styles.submitButtonLabel, (!canCreate || submitting) && styles.submitButtonLabelDisabled]}>
            {submitting ? "Creating…" : "Create Community"}
          </Text>
        </Pressable>
      </View>
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
  photoIcon: { fontSize: 28 },
  addPhotoLabel: { fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.coral, textAlign: "center", marginTop: spacing.sm },
  label: { fontFamily: typography.fontFamilyBold, fontSize: 14, color: colors.charcoal, marginTop: spacing.lg },
  helperText: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, marginTop: 2 },
  input: { backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 52, fontFamily: typography.fontFamilyRegular, fontSize: 16, color: colors.charcoal, marginTop: spacing.sm },
  counter: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 },
  sportRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  sportPill: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, justifyContent: "center" },
  sportPillSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  sportPillLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.charcoal },
  sportPillLabelSelected: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.white },
  textArea: { backgroundColor: colors.white, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 100, fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal, marginTop: spacing.sm, textAlignVertical: "top" },
  emptyInvite: { fontFamily: typography.fontFamilyRegular, fontSize: 13, color: colors.muted, fontStyle: "italic", marginTop: spacing.sm },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  inviteName: { flex: 1, fontFamily: typography.fontFamilyRegular, fontSize: 14, color: colors.charcoal },
  inviteButton: { height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.coral, justifyContent: "center" },
  inviteButtonInvited: { backgroundColor: colors.sageLight, borderColor: "transparent" },
  inviteButtonLabel: { fontFamily: typography.fontFamily, fontSize: 13, color: colors.coral },
  inviteButtonLabelInvited: { color: colors.sageDark },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  submitButton: { height: 52, borderRadius: radii.lg, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center" },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonLabel: { fontFamily: typography.fontFamilyBold, fontSize: 16, color: colors.white },
  submitButtonLabelDisabled: { color: "#94A3B8" },
});
