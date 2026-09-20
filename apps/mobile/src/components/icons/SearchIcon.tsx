import Svg, { Path } from "react-native-svg";

// arcticons:xiaoyuan-search
export function SearchIcon({ size = 24, color = "#94A3B8" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m42.501 42.5l-7.351-7.776a17.244 17.244 0 1 0-7.075 4.422"
      />
    </Svg>
  );
}
