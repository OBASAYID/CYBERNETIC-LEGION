import { cn } from "@/lib/utils";

const CYRUS_LOGO = "/images/cyrus-logo.png";

type CyrusSidebarBrandProps = {
  collapsed?: boolean;
  className?: string;
};

/** CYRUS raccoon mark — red aggression pass over the canonical logo asset. */
export function CyrusSidebarBrand({ collapsed, className }: CyrusSidebarBrandProps) {
  const size = collapsed ? "h-11 w-11" : "h-12 w-12";

  return (
    <div className={cn("relative shrink-0", className)}>
      {/* Red ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl blur-md"
        style={{
          background: "radial-gradient(circle, rgba(231,0,17,0.55) 0%, rgba(180,0,12,0.2) 45%, transparent 70%)",
          transform: "scale(1.35)",
        }}
        aria-hidden
      />

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl",
          size,
          "border border-white/40",
        )}
        style={{
          background: "linear-gradient(145deg, #2a2a2a 0%, #0a0a0a 100%)",
          boxShadow:
            "0 0 0 1px rgba(231,0,17,0.35), 0 0 22px rgba(231,0,17,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        {/* Red rim light */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(231,0,17,0.35) 0%, transparent 40%, transparent 60%, rgba(231,0,17,0.2) 100%)",
          }}
          aria-hidden
        />

        <img
          src={CYRUS_LOGO}
          alt="CYRUS"
          draggable={false}
          className="relative h-full w-full object-cover object-[center_42%] scale-[1.18]"
          style={{
            filter:
              "contrast(1.22) saturate(1.35) brightness(1.08) hue-rotate(145deg) drop-shadow(0 0 10px rgba(231,0,17,0.85))",
          }}
        />

        {/* Aggressive red eye punch */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-screen opacity-40"
          style={{
            background:
              "radial-gradient(circle at 38% 42%, rgba(255,40,40,0.55) 0%, transparent 22%), radial-gradient(circle at 62% 42%, rgba(255,40,40,0.55) 0%, transparent 22%)",
          }}
          aria-hidden
        />
      </div>

      {/* Corner brackets — tactical frame */}
      <span
        className="pointer-events-none absolute -left-0.5 -top-0.5 h-2.5 w-2.5 border-l-2 border-t-2 border-[#E70011]/80 rounded-tl-md"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-b-2 border-r-2 border-[#E70011]/70 rounded-br-md"
        aria-hidden
      />
    </div>
  );
}
