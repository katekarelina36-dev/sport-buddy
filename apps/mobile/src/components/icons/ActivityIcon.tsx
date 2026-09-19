import type { ReactElement } from "react";
import Svg, { Path, Circle, Ellipse, Rect, G } from "react-native-svg";

interface IconProps {
  size?: number;
}

// Shared corner motif across the whole set: a colored "ball" badge with a
// white motion-swirl (from the tennis design brief) recolored per activity —
// this is what visually ties all ten icons together as one family.
function BallBadge({ color }: { color: string }) {
  return (
    <>
      <Circle cx={13} cy={13} r={11} fill={color} />
      <Path
        fill="#fff"
        d="M10.6 15.4C8.3 13 5.1 11.9 2 12.1v1.2c2.8-.2 5.6.8 7.7 3c2.1 2.1 3.1 5 3 7.7h1.2c.2-3.1-.9-6.3-3.3-8.6M24 12.7c-2.8.1-5.6-.8-7.7-3c-2.1-2.1-3.1-5-3-7.7h-1.2c-.1 3.1 1 6.2 3.3 8.6c2.4 2.4 5.5 3.5 8.6 3.3z"
      />
    </>
  );
}

export function TennisIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <BallBadge color="#c7e755" />
      <Path
        fill="#d0d0d0"
        d="m52.8 34.8l1-1l-2.3-2.3l4-4L57 29l1-1l-1.5-1.5l3.8-3.8l-1-1l-3.8 3.8l-3.2-3.2l4-4l3.1 3.1l1-1l-3.1-3.1l2.5-2.5l-1-1l-2.5 2.5l-3.1-3.3l3.5-3.5l-1-1l-3.5 3.5L49 8.8l2.5-2.5l-1-1L48 7.8l-3.1-3.1l-1 1L47 8.8l-4 4l-3.2-3.2l3.8-3.8l-1-1l-3.8 3.8l-1.5-1.5l-1 1l1.5 1.5l-4 4l-2.3-2.3l-1 1l2.3 2.3l-4 4l-1.5-1.5l-1 1l1.5 1.5l-3.8 3.8l1 1l3.8-3.8l3.2 3.2l-4 4l-3.1-3.1l-1 1l3.1 3.1l-2.5 2.5l1 1l2.5-2.5l3.2 3.2l-3.5 3.5l1 1l3.5-3.5l3.2 3.2l-2.5 2.5l1 1l2.5-2.5l3.1 3.1l1-1l-3.1-3.1l4-4l3.2 3.2l-3.8 3.8l1 1l3.7-3.8l1.5 1.5l1-1l-1.5-1.5l4-4zm1.7-8.3l-4 4l-3.2-3.2l4-4zm-13.2 4.8l-3.2-3.2l4-4l3.2 3.2zm-3.4-11.4l3.2 3.2l-4 4l-3.2-3.2zm5-5l3.2 3.2l-4 4l-3.2-3.2zm.2 8.2l4-4l3.2 3.2l-4 4zm12.2-5.8l-4 4l-3.2-3.2l4-4zm-7.4-7.4l3.2 3.2l-4 4l-3.1-3.3zm-9.2.8l3.2 3.2l-4 4l-3.2-3.2zm-9 9l4-4l3.2 3.2l-4 4zm-.8 9.2l4-4l3.2 3.2l-4 4zm7.3 7.4L33 33.1l4-4l3.2 3.2zm9.3-.8l-3.2-3.2l4-4l3.2 3.2z"
      />
      <Path
        fill="#ff717f"
        d="M57.7 7.5c-6.8-6.8-19.4-5.4-28 3.2s-10 21.1-3.2 28c6.9 6.8 19.4 5.4 28-3.2s10-21.1 3.2-28M29 36.2c-5.8-5.8-4.6-16.3 2.7-23.6s17.8-8.5 23.6-2.7s4.6 16.3-2.7 23.6S34.7 42 29 36.2"
      />
      <Path
        fill="#ff717f"
        d="M38.1 42.9c.7 0-5.8-2.3-5.8-2.3s-8.2 3.7-9.8 2.1s2.1-9.8 2.1-9.8s-2.3-6.5-2.4-5.8c-.4 6.5-1.4 12.9-4.5 16.5c-.4.5-1 1-1 1l1.9 1.9l1.9 1.9s.5-.6 1-1c3.7-3 10.1-4.1 16.6-4.5"
      />
      <Path fill="#4d4f59" d="m3.53 56.721l13.646-13.647l4.88 4.879L8.407 61.6z" />
      <Path fill="#4d4f59" d="m10 50.2l3.4 6.3l2.1-2.1l-3.4-6.4zm-4.3 4.3l3.4 6.4l2.1-2.2l-3.4-6.3z" />
      <Path fill="#5f606c" d="m3.5 56.7l4.8 4.9l.8-.7l-3.4-6.4zm4.3-4.3l3.4 6.3l2.2-2.2l-3.4-6.3zm9.4-9.4l-.7.7l3.3 6.4l2.2-2.2z" />
      <Path fill="#4d4f59" d="m14.3 45.9l3.4 6.3l2.1-2.1l-3.3-6.4z" />
      <Path fill="#5f606c" d="m12.1 48l3.4 6.4l2.2-2.2l-3.4-6.3z" />
      <Path fill="#4d4f59" d="m3.056 56.263l1.556-1.555l5.727 5.728l-1.556 1.555zM15.17 44.169l1.556-1.556l5.726 5.73l-1.556 1.555z" />
    </Svg>
  );
}

export function RunningIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={40} cy={16} r={6} fill="#5f606c" />
      <Path
        d="M38 22L28 36 M28 36L37 40L33 52 M28 36L17 43L9 46 M34 24L45 19 M30 27L19 31"
        stroke="#ff6b4a"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function CyclingIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={20} cy={44} r={10} fill="none" stroke="#4d4f59" strokeWidth={3} />
      <Circle cx={44} cy={44} r={10} fill="none" stroke="#4d4f59" strokeWidth={3} />
      <Path d="M20 44L34 18L44 44M34 18L40 44M24 30H46" stroke="#2e7d32" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M34 18v-4M30 14h8M44 44l7-6" stroke="#4d4f59" strokeWidth={3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function ChessIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={16} r={7} fill="#1e293b" />
      <Rect x={25} y={22} width={14} height={3.5} rx={1.75} fill="#5f606c" />
      <Path d="M26 27h12l4 18H22z" fill="#1e293b" />
      <Rect x={19} y={47} width={26} height={6} rx={2.5} fill="#1e293b" />
    </Svg>
  );
}

export function BasketballIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Ellipse cx={13} cy={13} rx={11} ry={4} fill="none" stroke="#ff6b4a" strokeWidth={2.5} />
      <Path d="M4 14l1 8M9 15l1 9M13 15v9M17 15l-1 9M22 14l-1 8" stroke="#d0d0d0" strokeWidth={1} strokeLinecap="round" fill="none" />
      <Circle cx={40} cy={36} r={17} fill="#F0932B" />
      <Path
        d="M23 36h34M40 19v34M28 23c6 6 6 24 0 30M52 23c-6 6-6 24 0 30"
        stroke="#1e293b"
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

export function YogaIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={22} r={6} fill="#5f606c" />
      <Path
        d="M32 28c-10 2-16 8-18 16c-1 3 1 5 4 5h28c3 0 5-2 4-5c-2-8-8-14-18-16z"
        fill="#B39DDB"
      />
      <Path d="M16 44c3-2 6-2 8 0M40 44c2-2 5-2 8 0" stroke="#5f606c" strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function SwimmingIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={40} cy={22} r={5} fill="#5f606c" />
      <Path d="M34 27c4-2 8-2 12-4" stroke="#5f606c" strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d="M14 36c4-4 8-4 12 0s8 4 12 0s8-4 12 0" stroke="#4FC3F7" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M14 44c4-4 8-4 12 0s8 4 12 0s8-4 12 0" stroke="#29B6F6" strokeWidth={3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function ClimbingIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M16 44L28 20l7 9l5-7l11 22z" fill="#8D6E63" />
      <Path d="M28 20l4 5l-4 3l-4-3z" fill="#fff" />
      <Path d="M40 25v10" stroke="#4d4f59" strokeWidth={1.5} />
      <Path d="M40 25l6 3l-6 3z" fill="#ff717f" />
    </Svg>
  );
}

// streamline-cyber-color:football, used verbatim (24x24 viewBox, own palette).
export function FootballIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill="none">
        <Path fill="#fff" d="M12 .751L4.046 4.046L.751 12l3.295 7.954L12 23.249l7.954-3.295L23.249 12l-3.295-7.954z" />
        <Path
          fill="#bbd8ff"
          d="m8.924 17.113l-1.912-6.26l5.001-3.644l5.002 3.645l-1.91 6.259zM8.805 2.075l3.208 1.37l3.195-1.364L12 .75zM22.979 12.65l-2.876-3.309l.361-4.085L23.249 12zm-2.225 5.374l-3.74.861l-1.812 3.037l4.752-1.968zM1.021 12.65l2.876-3.309l-.361-4.085L.75 12zm2.225 5.374l3.74.861l1.812 3.037l-4.752-1.968z"
        />
        <Path
          stroke="#092f63"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 .751L4.046 4.046L.751 12l3.295 7.954L12 23.249l7.954-3.295L23.249 12l-3.295-7.954z"
        />
        <Path
          stroke="#092f63"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m8.924 17.113l-1.912-6.26l5.001-3.644l5.002 3.645l-1.91 6.259zM3.557 5.225l.364 4.118l-2.891 3.329m2.214 5.348l3.769.868l1.823 3.05m11.918-3.914l-3.74.861l-1.812 3.037l4.752-1.968zM12.013 7.209V3.445l3.195-1.365l4.746 1.966l.51 1.21l-.36 4.085l-3.09 1.512zm3.092 9.904l1.91 1.772m-8.091-1.772l-1.911 1.774M3.921 9.343l3.09 1.51"
        />
        <Path
          stroke="#092f63"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m8.805 2.075l3.208 1.37l3.195-1.364L12 .75zM22.979 12.65l-2.876-3.309l.361-4.085L23.249 12z"
        />
      </G>
    </Svg>
  );
}

export function DanceIcon({ size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={34} cy={16} r={5} fill="#5f606c" />
      <Path
        d="M34 21v12M34 22l-9-6M34 22l10-3M34 33l-8 12M34 33l9 9"
        stroke="#BA68C8"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
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

// Falls back to the tennis ball badge alone for any activity outside the
// known set, so a newly-added activity never renders a blank tile.
export function ActivityIcon({ name, size = 40 }: { name: string; size?: number }) {
  const Icon = ICONS_BY_ACTIVITY_NAME[name.toLowerCase()];
  if (Icon) return <Icon size={size} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <BallBadge color="#8A94A6" />
    </Svg>
  );
}
