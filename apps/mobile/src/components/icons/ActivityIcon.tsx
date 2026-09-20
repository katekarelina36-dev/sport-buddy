import type { ReactElement } from "react";
import Svg, { Path, Circle, G } from "react-native-svg";

interface IconProps {
  size?: number;
}

// Shared motif across the whole set: a colored circular badge with a
// white glyph centered on top — glyphs are Material Design Icons (MDI,
// via @iconify-json/mdi), chosen per activity since Flaticon itself isn't
// reachable from this environment and its one official npm package
// (flaticon-uicons) is a generic interface icon font with no sport icons.
// Each glyph's native 24x24 viewBox is scaled into a 32x32 area centered
// inside the 64x64 badge.
function IconBadge({ color, glyphPath }: { color: string; glyphPath: string }) {
  return (
    <>
      <Circle cx={32} cy={32} r={30} fill={color} />
      <G transform="translate(16, 16) scale(1.3333)">
        <Path fill="#fff" d={glyphPath} />
      </G>
    </>
  );
}

// mdi:tennis
export function TennisIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#8BC34A"
        glyphPath="M18 15a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 2a2 2 0 0 0-2 2a2 2 0 0 0 2 2a2 2 0 0 0 2-2a2 2 0 0 0-2-2M6.05 14.54s1.41-1.42 1.42-4.24c-.36-2.19.5-4.76 2.47-6.72C12.87.65 17.14.17 19.5 2.5c2.33 2.36 1.85 6.63-1.08 9.56c-1.96 1.97-4.53 2.83-6.72 2.47c-2.82.01-4.24 1.42-4.24 1.42l-4.24 4.24l-1.41-1.41zM18.07 3.93C16.5 2.37 13.5 2.84 11.35 5c-2.14 2.14-2.62 5.15-1.06 6.71c1.57 1.56 4.57 1.08 6.71-1.06c2.16-2.15 2.63-5.15 1.07-6.72"
      />
    </Svg>
  );
}

// mdi:run-fast
export function RunningIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#FF6B4A"
        glyphPath="M16.5 5.5a2 2 0 0 0 2-2a2 2 0 0 0-2-2a2 2 0 0 0-2 2a2 2 0 0 0 2 2m-3.6 13.9l1-4.4l2.1 2v6h2v-7.5l-2.1-2l.6-3A7.3 7.3 0 0 0 22 13v-2c-1.76.03-3.4-.89-4.3-2.4l-1-1.6c-.36-.6-1-1-1.7-1c-.3 0-.5.1-.8.1L9 8.3V13h2V9.6l1.8-.7l-1.6 8.1l-4.9-1l-.4 2zM4 9a1 1 0 0 1-1-1a1 1 0 0 1 1-1h3v2zm1-4a1 1 0 0 1-1-1a1 1 0 0 1 1-1h5v2zm-2 8a1 1 0 0 1-1-1a1 1 0 0 1 1-1h4v2z"
      />
    </Svg>
  );
}

// mdi:bike
export function CyclingIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#2E7D32"
        glyphPath="M5 20.5A3.5 3.5 0 0 1 1.5 17A3.5 3.5 0 0 1 5 13.5A3.5 3.5 0 0 1 8.5 17A3.5 3.5 0 0 1 5 20.5M5 12a5 5 0 0 0-5 5a5 5 0 0 0 5 5a5 5 0 0 0 5-5a5 5 0 0 0-5-5m9.8-2H19V8.2h-3.2l-1.94-3.27c-.29-.5-.86-.83-1.46-.83c-.47 0-.9.19-1.2.5L7.5 8.29C7.19 8.6 7 9 7 9.5c0 .63.33 1.16.85 1.47L11.2 13v5H13v-6.5l-2.25-1.65l2.32-2.35m5.93 13a3.5 3.5 0 0 1-3.5-3.5a3.5 3.5 0 0 1 3.5-3.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m0-8.5a5 5 0 0 0-5 5a5 5 0 0 0 5 5a5 5 0 0 0 5-5a5 5 0 0 0-5-5m-3-7.2c1 0 1.8-.8 1.8-1.8S17 1.2 16 1.2S14.2 2 14.2 3S15 4.8 16 4.8"
      />
    </Svg>
  );
}

// mdi:chess-king
export function ChessIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#1E293B"
        glyphPath="M19 22H5v-2h14zm-2-12c-1.42 0-2.74.77-3.45 2H13V7h3V5h-3V2h-2v3H8v2h3v5h-.55C9.35 10.09 6.9 9.43 5 10.54A4.013 4.013 0 0 0 3.5 16c.74 1.24 2.07 2 3.5 2h10a4 4 0 0 0 4-4a4 4 0 0 0-4-4"
      />
    </Svg>
  );
}

// mdi:basketball
export function BasketballIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#F0932B"
        glyphPath="M2.34 14.63c.6-.22 1.22-.33 1.88-.33q2.01 0 3.51 1.26L4.59 18.7a10.6 10.6 0 0 1-2.25-4.07M15.56 9.8c1.97 1.47 4.1 1.83 6.38 1.08c.03.21.06.59.06 1.12c0 1.03-.25 2.18-.72 3.45c-.47 1.26-1.05 2.28-1.73 3.05l-6.33-6.31zm-6.79 6.84c1.06 1.53 1.28 3.2.65 5.02c-1.42-.41-2.69-1.05-3.75-1.93zm3.42-3.42l6.31 6.33c-2.17 1.9-4.72 2.7-7.62 2.39c.21-.66.32-1.38.32-2.16c0-.62-.14-1.35-.42-2.18s-.61-1.51-.98-2.04zM8.81 14.5a6.7 6.7 0 0 0-3.23-1.59c-1.22-.23-2.39-.16-3.52.22c-.03-.22-.06-.6-.06-1.13c0-1.03.25-2.18.72-3.45c.47-1.26 1.05-2.28 1.73-3.05l6.66 6.69zm6.75-6.77c-1.34-1.65-1.65-3.45-.93-5.39c.62.16 1.33.46 2.13.92c.79.45 1.44.9 1.94 1.33zm6.1 1.65c-.6.21-1.22.32-1.88.32c-1.09 0-2.14-.32-3.14-.98l3.09-3.05c.88 1.1 1.52 2.33 1.93 3.71m-9.47 1.73L5.5 4.45c2.17-1.9 4.72-2.7 7.63-2.39q-.33.99-.33 2.16c0 .72.16 1.53.49 2.44c.33.9.71 1.62 1.21 2.15z"
      />
    </Svg>
  );
}

// mdi:yoga
export function YogaIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#B39DDB"
        glyphPath="M13 2a2 2 0 1 0 0 4c1.11 0 2-.89 2-2a2 2 0 0 0-2-2M4 7v2h6v6l-5.07 5.07l1.41 1.43l6.72-6.73L17 17.13V21h2v-4.43c0-.36-.18-.68-.5-.86L15 13.6V9h6V7z"
      />
    </Svg>
  );
}

// mdi:swim
export function SwimmingIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#29B6F6"
        glyphPath="M2 18c2.22-1 4.44-2 6.67-2c2.22 0 4.44 2 6.66 2c2.23 0 4.45-2 6.67-2v3c-2.22 0-4.44 2-6.67 2c-2.22 0-4.44-2-6.66-2c-2.23 0-4.45 1-6.67 2zm6.67-5c-.78 0-1.55.12-2.32.32l4.92-3.44l-1.04-1.24c-.14-.17-.23-.4-.23-.64c0-.34.17-.65.44-.83l5.72-4l1.15 1.63l-4.84 3.39l5.23 6.23c-.79.33-1.58.58-2.37.58c-2.22 0-4.44-2-6.66-2M18 7a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2"
      />
    </Svg>
  );
}

// mdi:carabiner
export function ClimbingIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#8D6E63"
        glyphPath="M8 17.5c0 .83-.67 1.5-1.5 1.5S5 18.33 5 17.5S5.67 16 6.5 16s1.5.67 1.5 1.5M18 5.59C17.79 3.54 16.18 2 14.24 2H8.88C6.95 2 5.36 3.5 5.15 5.53L5 6.59C4.92 7.34 5.5 8 6.24 8c.63 0 1.15-.47 1.23-1.09l.14-1.09c.07-.75.62-1.32 1.27-1.32h5.36c.65 0 1.2.57 1.26 1.32l1 11.06c.09.86-.5 1.62-1.25 1.62l-5.21-.68a3.46 3.46 0 0 1-1.24 2.36l6.13.82h.32c1.02 0 2.01-.44 2.71-1.22A4.22 4.22 0 0 0 19 16.65zm-6.34 2.35c-.58-.37-1.35-.19-1.72.4L6.39 14h.11c.88 0 1.68.34 2.3.88l3.26-5.22c.37-.58.19-1.35-.4-1.72"
      />
    </Svg>
  );
}

// mdi:soccer
export function FootballIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#37474F"
        glyphPath="m16.93 17.12l-.8-1.36l1.46-4.37l1.41-.47l1 .75v.14c0 .07.03.13.03.19c0 1.97-.66 3.71-1.97 5.21zM9.75 15l-1.37-4.03L12 8.43l3.62 2.54L14.25 15zM12 20.03c-.88 0-1.71-.14-2.5-.42l-.69-1.51l.66-1.1h5.11l.61 1.1l-.69 1.51c-.79.28-1.62.42-2.5.42m-6.06-2.82c-.53-.62-.99-1.45-1.38-2.46c-.39-1.02-.59-1.94-.59-2.75c0-.06.03-.12.03-.19v-.14l1-.75l1.41.47l1.46 4.37l-.8 1.36zM11 5.29v1.4L7 9.46l-1.34-.42l-.42-1.36C5.68 7 6.33 6.32 7.19 5.66s1.68-1.09 2.46-1.31zm3.35-.94c.78.22 1.6.65 2.46 1.31S18.32 7 18.76 7.68l-.42 1.36l-1.34.43l-4-2.77V5.29zm-9.42.58C3 6.89 2 9.25 2 12s1 5.11 2.93 7.07S9.25 22 12 22s5.11-1 7.07-2.93S22 14.75 22 12s-1-5.11-2.93-7.07S14.75 2 12 2S6.89 3 4.93 4.93"
      />
    </Svg>
  );
}

// mdi:human-female-dance
export function DanceIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <IconBadge
        color="#BA68C8"
        glyphPath="M17 17h-2v6h-2v-6h-2.12l-1.54 1.93l2.37 2.36l-1.42 1.42l-2.36-2.37c-.35-.34-.55-.81-.58-1.3s.12-.98.43-1.36l.54-.68H7l2-4v-3c-.62.47-1.12 1.07-1.47 1.76c-.35.7-.53 1.46-.53 2.24H5a7 7 0 0 1 7-7c1.33 0 2.6-.53 3.54-1.46C16.47 4.6 17 3.33 17 2h2c0 1.32-.38 2.62-1.09 3.73A7 7 0 0 1 15 8.31V13zM14 4c0 .4-.12.78-.34 1.11s-.53.59-.89.74a2 2 0 0 1-2.18-.44c-.28-.28-.47-.63-.55-1.02s-.04-.79.11-1.15c.15-.37.41-.68.74-.9S11.6 2 12 2c.53 0 1.04.21 1.41.59c.38.37.59.88.59 1.41"
      />
    </Svg>
  );
}

const ICONS_BY_ACTIVITY_NAME: Record<string, (props: IconProps) => ReactElement> = {
  tennis: TennisIcon,
  running: RunningIcon,
  cycling: CyclingIcon,
  chess: ChessIcon,
  basketball: BasketballIcon,
  yoga: YogaIcon,
  swimming: SwimmingIcon,
  climbing: ClimbingIcon,
  football: FootballIcon,
  dance: DanceIcon,
};

// Falls back to a plain grey badge for any activity outside the known set,
// so a newly-added activity never renders a blank tile.
export function ActivityIcon({ name, size = 40 }: { name: string; size?: number }) {
  const Icon = ICONS_BY_ACTIVITY_NAME[name.toLowerCase()];
  if (Icon) return <Icon size={size} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={30} fill="#8A94A6" />
    </Svg>
  );
}
