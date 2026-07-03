import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared frosted-glass surface for dashboard cards ("Apple glass" look).
// Heavy backdrop blur + saturation frosts the busy background so content stays readable;
// the inset top highlight + soft drop shadow give the pane depth.
export const glassCard =
  "rounded-2xl border border-white/15 bg-white/[0.11] backdrop-blur-3xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_24px_50px_-20px_rgba(0,0,0,0.8)]"

export const glassCardHover =
  "transition duration-200 hover:border-white/25 hover:bg-white/[0.1]"
