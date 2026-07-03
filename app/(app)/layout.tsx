import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

// Shared app shell: themed hero background + grid + watermark on the left,
// persistent nav sidebar on the right. Every routed page renders as children.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-1">
      <div className="l4d2-hero relative flex-1 overflow-y-auto">
        {/* Smoke texture (from Figma) */}
        <div
          aria-hidden
          className="l4d2-smoke-layer pointer-events-none absolute inset-0"
        />

        {/* L4D2 survivor cast key art (from Figma), anchored bottom, fading up */}
        <div
          aria-hidden
          className="l4d2-cast-layer pointer-events-none absolute inset-0"
        />

        <div className="l4d2-grid pointer-events-none absolute inset-0" />

        {/* Giant L4D2 watermark */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 select-none font-display text-[22vw] font-extrabold leading-none tracking-tighter text-white/[0.03]"
        >
          L4D2
        </span>

        {/* Extra bottom padding on mobile so content clears the bottom nav. */}
        <div className="relative mx-auto w-full max-w-6xl px-6 py-8 pb-28 md:px-10 md:py-10 md:pb-10">
          {children}
        </div>
      </div>

      {/* Right rail on desktop, bottom bar on mobile. */}
      <Sidebar />
      <BottomNav />
    </div>
  );
}
