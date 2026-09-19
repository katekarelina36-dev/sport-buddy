// Bug fix batch (Round 6), Bug 1: static list backing the city autocomplete —
// small and fixed, so no API call is needed.
export const EU_CAPITALS = [
  "Amsterdam",
  "Athens",
  "Belgrade",
  "Berlin",
  "Bratislava",
  "Brussels",
  "Bucharest",
  "Budapest",
  "Copenhagen",
  "Dublin",
  "Helsinki",
  "Kyiv",
  "Lisbon",
  "Ljubljana",
  "Luxembourg City",
  "Madrid",
  "Nicosia",
  "Oslo",
  "Palermo",
  "Paris",
  "Prague",
  "Riga",
  "Rome",
  "Sofia",
  "Stockholm",
  "Tallinn",
  "Vienna",
  "Vilnius",
  "Warsaw",
  "Zagreb",
];

export function isValidCity(value: string): boolean {
  return EU_CAPITALS.includes(value);
}
