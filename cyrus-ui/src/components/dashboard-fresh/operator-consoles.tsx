import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BOTSWANA_BEEF_EXPORTS_HERO_URL,
  BOTSWANA_COAT_OF_ARMS_DEBSWANA_URL,
  BOTSWANA_PRESIDENT_DUMA_BOKO_URL,
  BOTSWANA_PRESIDENT_FESTUS_MOGAE_URL,
  BOTSWANA_PRESIDENT_IAN_KHAMA_URL,
  BOTSWANA_PRESIDENT_KETUMILE_MASIRE_URL,
  BOTSWANA_PRESIDENT_MOKGWEETSI_MASISI_URL,
  BOTSWANA_PRESIDENT_SERETSE_KHAMA_URL,
  BOTSWANA_TECHNOLOGY_HERO_URL,
  BOTSWANA_TOURISM_WILDLIFE_URL,
  CYRUS_MINING_DIAMOND_URL,
  TSODILO_DANCE_HERO_URL,
} from "@/lib/dashboard-backdrop";
import { cn } from "@/lib/utils";

/** Shared dark console surface — matches Live panel sidebar. */
export const DASHBOARD_DARK_CONSOLE_BG =
  "bg-gradient-to-b from-[#0a0e14] via-[#060910] to-[#020406]";
/** Opaque top stack (System Spotlight) — sits on the white dashboard page. */
export const DASHBOARD_TOP_CONSOLE_BG =
  "bg-gradient-to-b from-[#080b10] via-[#05080d] to-[#010306]";
export const DASHBOARD_DARK_CONSOLE_INNER =
  "rounded-xl border border-white/10 bg-gradient-to-b from-[#0c1018] via-[#070b10] to-[#030508]";
export const DASHBOARD_CONSOLE_SHADOW =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_46px_rgba(0,0,0,0.52)]";

type ConsoleStack = "standalone" | "top" | "bottom";

function stackShellClass(stack: ConsoleStack) {
  if (stack === "top") {
    return "rounded-t-2xl rounded-b-none border-x border-t border-white/14 border-b border-b-white/10";
  }
  if (stack === "bottom") {
    return "rounded-b-2xl rounded-t-none border-x border-b border-white/14 border-t-0";
  }
  return "rounded-2xl border border-white/14";
}

function ConsoleShell({
  title,
  kicker,
  icon: Icon,
  accent = "cyan",
  children,
  className = "",
  stack = "standalone",
}: {
  title: string;
  kicker: string;
  icon: LucideIcon;
  accent?: "cyan" | "amber" | "violet" | "emerald";
  children: ReactNode;
  className?: string;
  stack?: ConsoleStack;
}) {
  const ring =
    accent === "amber"
      ? "border-amber-500/25"
      : accent === "violet"
        ? "border-violet-500/25"
        : accent === "emerald"
          ? "border-emerald-500/25"
          : "border-cyan-500/25";
  const iconTone =
    accent === "amber"
      ? "text-amber-300"
      : accent === "violet"
        ? "text-violet-300"
        : accent === "emerald"
          ? "text-emerald-300"
          : "text-cyan-300";

  const surfaceBg = stack === "top" ? DASHBOARD_TOP_CONSOLE_BG : DASHBOARD_DARK_CONSOLE_BG;

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden p-4 cyrus-xs-console-shell",
        stackShellClass(stack),
        surfaceBg,
        DASHBOARD_CONSOLE_SHADOW,
        stack === "top" && "text-white shadow-[0_20px_48px_rgba(0,0,0,0.55)]",
        stack !== "top" && "backdrop-blur-xl",
        className,
      )}
    >
      {stack === "top" ? (
        <div className="pointer-events-none absolute inset-0 bg-[#020406]" aria-hidden />
      ) : null}
      <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.08]" aria-hidden />
      <div className="pointer-events-none absolute -right-8 top-2 h-28 w-28 rounded-full bg-black/40 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${ring} bg-white/[0.04]`}>
          <Icon className={`h-4 w-4 ${iconTone}`} aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-white/45">{kicker}</p>
          <h2
            className="text-sm font-semibold text-white/95"
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

type SpotlightPillar = {
  title: string;
  sub: string;
  image: string;
  variant?: "default" | "mining" | "beef" | "technology";
};

const PILLAR_RENDER: Record<
  Exclude<SpotlightPillar["variant"], "default" | undefined>,
  {
    frame: string;
    img: string;
    filter?: string;
    sub: string;
    badge?: string;
  }
> = {
  mining: {
    frame:
      "border-white/20 bg-[#0a0c10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(186,230,253,0.12)]",
    img: "object-cover object-[center_42%] brightness-[1.08] contrast-[1.18] saturate-[0.92]",
    filter: "drop-shadow(0 0 18px rgba(186,230,253,0.28)) drop-shadow(0 8px 16px rgba(0,0,0,0.55))",
    sub: "text-cyan-100/70",
    badge: "Refined",
  },
  beef: {
    frame:
      "border-amber-200/25 bg-[#1a1208] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(251,191,36,0.14)]",
    img: "object-cover object-[center_38%] brightness-[1.04] contrast-[1.14] saturate-[1.08]",
    filter: "drop-shadow(0 0 14px rgba(251,191,36,0.22)) drop-shadow(0 8px 18px rgba(0,0,0,0.5))",
    sub: "text-amber-100/75",
    badge: "Exports",
  },
  technology: {
    frame:
      "border-sky-200/20 bg-[#0a1018] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_22px_rgba(56,189,248,0.12)]",
    img: "object-cover object-[center_40%] brightness-[1.05] contrast-[1.16] saturate-[1.06]",
    filter: "drop-shadow(0 0 16px rgba(56,189,248,0.2)) drop-shadow(0 8px 18px rgba(0,0,0,0.52))",
    sub: "text-sky-100/75",
    badge: "Industry",
  },
};

/** Hero flank art — vignette + console-toned glow so PNGs feel embedded, not pasted. */
function SpotlightHeroFlank({
  src,
  alt,
  side,
  tone = "neutral",
  blend = "normal",
}: {
  src: string;
  alt: string;
  side: "left" | "right";
  tone?: "heritage" | "mining" | "neutral";
  blend?: "normal" | "lighten";
}) {
  const toneGlow =
    tone === "heritage"
      ? "from-amber-500/12 via-transparent to-cyan-400/8"
      : tone === "mining"
        ? "from-cyan-300/14 via-transparent to-amber-400/10"
        : "from-white/8 via-transparent to-white/4";

  const edgeFade =
    side === "left"
      ? "bg-gradient-to-r from-transparent via-transparent to-[#080b10]/95"
      : "bg-gradient-to-l from-transparent via-transparent to-[#080b10]/95";

  return (
    <div
      className={cn(
        "relative h-36 shrink-0 overflow-hidden",
        side === "left" ? "w-[7.25rem] sm:w-28" : "w-[6.75rem] sm:w-[6.5rem]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,rgba(7,11,18,0)_38%,rgba(7,11,18,0.72)_88%,rgba(7,11,18,0.98)_100%)]"
        aria-hidden
      />
      <div className={cn("pointer-events-none absolute inset-0 z-[2] mix-blend-soft-light", edgeFade)} aria-hidden />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b opacity-80",
          toneGlow,
        )}
        aria-hidden
      />
      <img
        src={src}
        alt={alt}
        className={cn(
          "relative z-0 h-full w-full object-contain object-center",
          blend === "lighten" && "mix-blend-lighten",
          side === "left" ? "object-[center_42%]" : "object-[center_38%]",
          "brightness-[1.08] contrast-[1.12] saturate-[1.06]",
          "drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]",
          tone === "heritage"
            ? "drop-shadow-[0_0_22px_rgba(251,191,36,0.12)]"
            : "drop-shadow-[0_0_20px_rgba(125,211,252,0.14)]",
        )}
        loading="lazy"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-10 bg-gradient-to-t from-[#080b10] via-[#080b10]/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}

type SpotlightPresident = {
  name: string;
  term: string;
  order: number;
  image: string;
  blend?: "normal" | "lighten";
  /** Portrait grading for archival vs modern studio shots. */
  grade?: "heritage" | "studio";
};

const BOTSWANA_PRESIDENTS: SpotlightPresident[] = [
  {
    order: 1,
    name: "Sir Seretse Khama",
    term: "1966 – 1980",
    image: BOTSWANA_PRESIDENT_SERETSE_KHAMA_URL,
    grade: "heritage",
    blend: "normal",
  },
  {
    order: 2,
    name: "Sir Ketumile Masire",
    term: "1980 – 1998",
    image: BOTSWANA_PRESIDENT_KETUMILE_MASIRE_URL,
    grade: "studio",
    blend: "lighten",
  },
  {
    order: 3,
    name: "Festus Mogae",
    term: "1998 – 2008",
    image: BOTSWANA_PRESIDENT_FESTUS_MOGAE_URL,
    grade: "studio",
    blend: "lighten",
  },
  {
    order: 4,
    name: "Ian Khama",
    term: "2008 – 2018",
    image: BOTSWANA_PRESIDENT_IAN_KHAMA_URL,
    grade: "studio",
    blend: "lighten",
  },
  {
    order: 5,
    name: "Mokgweetsi Masisi",
    term: "2018 – 2024",
    image: BOTSWANA_PRESIDENT_MOKGWEETSI_MASISI_URL,
    grade: "studio",
    blend: "lighten",
  },
  {
    order: 6,
    name: "Duma Boko",
    term: "2024 – present",
    image: BOTSWANA_PRESIDENT_DUMA_BOKO_URL,
    grade: "studio",
    blend: "lighten",
  },
];

function SpotlightPresidentCard({ president }: { president: SpotlightPresident }) {
  const heritage = president.grade === "heritage";

  return (
    <article
      className={`group relative overflow-hidden p-2 shadow-[0_10px_22px_rgba(0,0,0,0.45)] cyrus-xs-spotlight-president ${DASHBOARD_DARK_CONSOLE_INNER} border-amber-200/15`}
    >
      <div className="relative h-[4.75rem] w-full overflow-hidden rounded-lg border border-white/12 bg-[#0a0c10]">
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_28%,rgba(251,191,36,0.1),transparent_55%),radial-gradient(ellipse_at_center,rgba(7,11,18,0)_30%,rgba(7,11,18,0.85)_100%)]"
          aria-hidden
        />
        <img
          src={president.image}
          alt={president.name}
          className={cn(
            "relative z-0 h-full w-full object-cover object-[center_18%]",
            president.blend === "lighten" && "mix-blend-lighten",
            heritage
              ? "brightness-[1.12] contrast-[1.22] saturate-0 sepia-[0.35]"
              : "brightness-[1.06] contrast-[1.14] saturate-[0.92]",
            "drop-shadow-[0_8px_18px_rgba(0,0,0,0.5)]",
          )}
          loading="lazy"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#080b10] via-[#080b10]/35 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1.5 top-1.5 z-[3] flex h-5 w-5 items-center justify-center rounded-full border border-white/25 bg-black/50 text-[9px] font-bold text-amber-100/95 backdrop-blur-sm"
          aria-hidden
        >
          {president.order}
        </div>
      </div>
      <div className="mt-2 min-h-[2.6rem]">
        <p
          className="text-[10px] font-semibold leading-tight text-white/95"
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          {president.name}
        </p>
        <p className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.14em] text-amber-100/65">{president.term}</p>
      </div>
    </article>
  );
}

function SpotlightPillarCard({ pillar }: { pillar: SpotlightPillar }) {
  const variant = pillar.variant ?? "default";
  const refined = variant !== "default" ? PILLAR_RENDER[variant] : null;

  return (
    <article
      className={`group relative overflow-hidden p-2 shadow-[0_10px_22px_rgba(0,0,0,0.45)] ${DASHBOARD_DARK_CONSOLE_INNER}`}
    >
      <div
        className={cn(
          "relative h-20 w-full overflow-hidden rounded-lg border",
          refined ? refined.frame : "border-transparent",
        )}
      >
        <img
          src={pillar.image}
          alt={pillar.title}
          className={cn(
            "h-full w-full transition duration-500 group-hover:scale-[1.04]",
            refined ? refined.img : "object-cover brightness-[0.9] contrast-[1.08] saturate-[1.05] group-hover:scale-[1.03]",
          )}
          style={refined?.filter ? { filter: refined.filter } : undefined}
          loading="lazy"
        />
        {variant === "mining" ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_38%,rgba(255,255,255,0.22),transparent_42%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-cyan-200/10 via-transparent to-violet-200/10 mix-blend-screen"
              aria-hidden
            />
          </>
        ) : null}
        {variant === "beef" ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(251,191,36,0.18),transparent_48%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-sky-300/10 via-transparent to-amber-300/12 mix-blend-screen"
              aria-hidden
            />
          </>
        ) : null}
        {variant === "technology" ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(125,211,252,0.16),transparent_46%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-sky-400/12 via-transparent to-amber-300/10 mix-blend-screen"
              aria-hidden
            />
          </>
        ) : null}
        {refined ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent"
              aria-hidden
            />
            {refined.badge ? (
              <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/25 bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm">
                {refined.badge}
              </div>
            ) : null}
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/25 to-transparent" />
        )}
      </div>
      <div className="mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/92">{pillar.title}</p>
        <p className={cn("text-[10px]", refined?.sub ?? "text-slate-300/80")}>{pillar.sub}</p>
      </div>
    </article>
  );
}

export function SystemSpotlightConsole() {
  const pillars: SpotlightPillar[] = [
    { title: "Tourism", sub: "Wildlife safari", image: BOTSWANA_TOURISM_WILDLIFE_URL },
    { title: "Culture", sub: "Tsodilo heritage", image: TSODILO_DANCE_HERO_URL },
    {
      title: "Mining",
      sub: "Diamond strength",
      image: CYRUS_MINING_DIAMOND_URL,
      variant: "mining",
    },
    {
      title: "Beef exports",
      sub: "Cattle economy",
      image: BOTSWANA_BEEF_EXPORTS_HERO_URL,
      variant: "beef",
    },
    {
      title: "Technology",
      sub: "Digital growth",
      image: BOTSWANA_TECHNOLOGY_HERO_URL,
      variant: "technology",
    },
  ];

  return (
    <ConsoleShell title="System spotlight" kicker="Featured console" icon={Sparkles} accent="amber" stack="top">
      <div
        className={`relative mb-3 overflow-hidden p-2.5 shadow-[0_10px_22px_rgba(0,0,0,0.45)] cyrus-xs-spotlight-hero ${DASHBOARD_DARK_CONSOLE_INNER}`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_50%,rgba(251,191,36,0.07),transparent_42%),radial-gradient(ellipse_at_82%_50%,rgba(56,189,248,0.08),transparent_40%)]"
          aria-hidden
        />
        <div className="relative flex items-stretch gap-2 sm:gap-3">
          <SpotlightHeroFlank
            src={TSODILO_DANCE_HERO_URL}
            alt="Tsodilo spiritual dance"
            side="left"
            tone="heritage"
            blend="normal"
          />
          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-[9px] uppercase tracking-[0.28em] text-amber-200/55">Botswana · heritage &amp; governance</p>
            <h3
              className="mt-1 bg-gradient-to-r from-amber-100 via-white to-sky-200/90 bg-clip-text text-[1.65rem] font-semibold leading-[1.15] tracking-[0.14em] text-transparent sm:text-[1.85rem]"
              style={{ fontFamily: "'Cinzel', 'Times New Roman', serif" }}
            >
              CORE OF PEACE
            </h3>
            <p
              className="mt-2 text-[12px] leading-relaxed text-slate-200/82 sm:text-[13px]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Since independence in 1966, Botswana has guarded one of Africa&apos;s longest unbroken democracies —
              peaceful handovers of power, unity across peoples, and the calm strength that Pula symbolises: rain,
              blessing, and a nation choosing dialogue over division.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-100/85">
                Since 1966
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-100/85">
                Peaceful democracy
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-100/85">
                Pula · rain &amp; blessing
              </span>
            </div>
          </div>
          <SpotlightHeroFlank
            src={BOTSWANA_COAT_OF_ARMS_DEBSWANA_URL}
            alt="Botswana coat of arms and Debswana mining emblem"
            side="right"
            tone="mining"
            blend="lighten"
          />
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {pillars.map((pillar) => (
          <SpotlightPillarCard key={pillar.title} pillar={pillar} />
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-[9px] font-mono uppercase tracking-[0.28em] text-amber-200/55">Republic leadership</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 cyrus-xs-spotlight-presidents">
          {BOTSWANA_PRESIDENTS.map((president) => (
            <SpotlightPresidentCard key={president.order} president={president} />
          ))}
        </div>
      </div>
    </ConsoleShell>
  );
}

export function OperatorConsoleCluster() {
  return (
    <div className="flex flex-col gap-0 cyrus-xs-console-cluster">
      <div className="overflow-hidden rounded-t-2xl bg-[#020406] shadow-[0_20px_48px_rgba(0,0,0,0.62)]">
        <SystemSpotlightConsole />
      </div>
    </div>
  );
}
