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

/** Filename-safe slug for a map, e.g. "Dead Center" → "dead-center". Matches
 *  the extracted campaign banners in public/maps/<slug>.jpg. */
export function mapSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Campaigns that have a Steam completion-achievement icon at
// public/maps/ach/<slug>.jpg. Only Blood Harvest lacks one → banner fallback.
const ACH_SLUGS = new Set([
  "dead-center", "dark-carnival", "swamp-fever", "hard-rain", "the-parish",
  "the-passing", "the-sacrifice", "no-mercy", "crash-course", "death-toll",
  "dead-air", "cold-stream", "the-last-stand",
]);

/** Wide in-game campaign banner for a map. */
export function mapBannerSrc(name: string): string {
  return `/maps/${mapSlug(name)}.jpg`;
}

// Campaigns with a titled banner PNG in public/maps/names/<slug>.png.
// The Last Stand has none → plain banner fallback.
const NAME_BANNER_SLUGS = new Set([
  "dead-center", "dark-carnival", "swamp-fever", "hard-rain", "the-parish",
  "the-passing", "the-sacrifice", "no-mercy", "crash-course", "death-toll",
  "dead-air", "blood-harvest", "cold-stream",
]);

/** Titled campaign banner (with the map name on it) when available, else the
 *  plain banner. */
export function mapNameBannerSrc(name: string): string {
  const s = mapSlug(name);
  return NAME_BANNER_SLUGS.has(s) ? `/maps/names/${s}.png` : `/maps/${s}.jpg`;
}

/** Square icon: the Steam completion-achievement icon when we have one, else
 *  the wide banner (CSS crops it square). */
export function mapIconSrc(name: string): string {
  const s = mapSlug(name);
  return ACH_SLUGS.has(s) ? `/maps/ach/${s}.jpg` : `/maps/${s}.jpg`;
}

export type MapLength = "any" | "short-medium" | "medium-long";

/** Does a map's chapter count fall in the requested length bucket? */
export function inLengthBucket(acts: number, bucket: MapLength): boolean {
  if (bucket === "short-medium") return acts <= 4; // 2–4 chapters
  if (bucket === "medium-long") return acts >= 4; // 4–5 chapters
  return true;
}
