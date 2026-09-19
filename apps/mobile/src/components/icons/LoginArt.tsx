import Svg, { Path, Line, Circle } from "react-native-svg";

// Faint court + handshake motif used behind the auth form. Kept as line art
// (not a photo) so it can sit at very low opacity behind form fields and
// still read at a glance, matching the rest of the icon set's style.
export function LoginArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      {/* court lines receding toward the net */}
      <Path d="M40 800 L150 260 M360 800 L250 260 M0 620 L400 620 M60 460 L340 460" stroke="#01232E" strokeWidth={3} fill="none" />
      {/* net */}
      <Line x1="90" y1="330" x2="310" y2="330" stroke="#01232E" strokeWidth={5} />
      <Path
        d="M90 330 L90 300 M310 330 L310 300"
        stroke="#01232E"
        strokeWidth={5}
        strokeLinecap="round"
      />

      {/* left player, reaching to shake hands */}
      <Circle cx={150} cy={220} r={22} fill="#01232E" />
      <Path
        d="M150 242 C120 260 108 300 112 340 M112 340 L150 360 M150 360 L200 320"
        stroke="#01232E"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M108 300 L70 330" stroke="#EE5B00" strokeWidth={8} strokeLinecap="round" />
      <Circle cx={64} cy={335} r={14} fill="none" stroke="#EE5B00" strokeWidth={6} />

      {/* right player, reaching to shake hands */}
      <Circle cx={250} cy={220} r={22} fill="#01232E" />
      <Path
        d="M250 242 C280 260 292 300 288 340 M288 340 L250 360 M250 360 L200 320"
        stroke="#01232E"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M292 300 L330 330" stroke="#EE5B00" strokeWidth={8} strokeLinecap="round" />
      <Circle cx={336} cy={335} r={14} fill="none" stroke="#EE5B00" strokeWidth={6} />

      {/* clasped hands */}
      <Circle cx={200} cy={320} r={12} fill="#01232E" />
    </Svg>
  );
}
