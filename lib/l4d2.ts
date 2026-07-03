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
