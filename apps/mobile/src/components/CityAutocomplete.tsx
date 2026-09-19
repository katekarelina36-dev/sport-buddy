import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from "react-native";
import { colors, spacing, typography, radii } from "../theme";
import { EU_CAPITALS, isValidCity } from "../utils/euCapitals";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

// Bug fix batch (Round 6), Bug 1: searchable dropdown over the static EU
// capitals list, replacing the old plain city text input. Validation (must
// pick from the list) is shown once the field is touched and then blurred.
export function CityAutocomplete({ value, onChangeText, placeholder = "Start typing your city..." }: Props) {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const matches =
    value.trim().length > 0 ? EU_CAPITALS.filter((c) => c.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 5) : [];

  // Fix 5 (Round 7): selecting a suggestion fully fills the field with the
  // exact list spelling, closes the dropdown, and dismisses the keyboard —
  // previously the value updated but focus/keyboard stayed put.
  function selectCity(city: string) {
    onChangeText(city);
    setOpen(false);
    setTouched(true);
    inputRef.current?.blur();
    Keyboard.dismiss();
  }

  function handleBlur() {
    setTouched(true);
    // Delay so a tap on a dropdown row registers before the list unmounts.
    setTimeout(() => setOpen(false), 150);
  }

  const showError = touched && value.trim().length > 0 && !isValidCity(value);

  return (
    <View>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setOpen(text.trim().length > 0);
        }}
        onFocus={() => setOpen(value.trim().length > 0)}
        onBlur={handleBlur}
      />

      {open && matches.length > 0 && (
        <View style={styles.dropdown}>
          {matches.map((city, i) => (
            <Pressable key={city} style={[styles.row, i === matches.length - 1 && styles.rowLast]} onPress={() => selectCity(city)}>
              <HighlightedLabel text={city} query={value.trim()} />
            </Pressable>
          ))}
        </View>
      )}

      {showError && <Text style={styles.errorText}>Please select a city from the list</Text>}
    </View>
  );
}

function HighlightedLabel({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1 || !query) return <Text style={styles.rowText}>{text}</Text>;
  return (
    <Text style={styles.rowText}>
      {text.slice(0, index)}
      <Text style={styles.rowTextMatch}>{text.slice(index, index + query.length)}</Text>
      {text.slice(index + query.length)}
    </Text>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 16,
    color: colors.charcoal,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: "hidden",
  },
  row: { height: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowLast: { borderBottomWidth: 0 },
  rowText: { fontFamily: typography.fontFamilyRegular, fontSize: 15, color: colors.charcoal },
  rowTextMatch: { fontFamily: typography.fontFamilyBold, color: colors.coral },
  errorText: { fontFamily: typography.fontFamilyRegular, fontSize: 12, color: colors.error, marginTop: 4 },
});
