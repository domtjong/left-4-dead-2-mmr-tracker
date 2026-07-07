// L4D2 official campaigns, used as a match's map. Order follows the game menu.
export const MAPS = [
  "Dead Center",
  "Dark Carnival",
  "Swamp Fever",
  "Hard Rain",
  "The Parish",
  "The Passing",
  "The Sacrifice",
  "No Mercy",
  "Crash Course",
  "Death Toll",
  "Dead Air",
  "Blood Harvest",
  "Cold Stream",
  "The Last Stand",
] as const;

export type L4D2Map = (typeof MAPS)[number];

// Playable chapters per campaign — a rough proxy for how long a game runs.
// Used to bucket maps into short/medium/long on the balancer's map suggester.
export const MAP_ACTS: Record<L4D2Map, number> = {
  "Dead Center": 4,
  "Dark Carnival": 5,
  "Swamp Fever": 4,
  "Hard Rain": 4,
  "The Parish": 5,
  "The Passing": 3,
  "The Sacrifice": 3,
  "No Mercy": 5,
  "Crash Course": 2,
  "Death Toll": 5,
  "Dead Air": 5,
  "Blood Harvest": 5,
  "Cold Stream": 4,
  "The Last Stand": 2,
};

export type MapLength = "any" | "short-medium" | "medium-long";

/** Does a map's chapter count fall in the requested length bucket? */
export function inLengthBucket(acts: number, bucket: MapLength): boolean {
  if (bucket === "short-medium") return acts <= 4; // 2–4 chapters
  if (bucket === "medium-long") return acts >= 4; // 4–5 chapters
  return true;
}
