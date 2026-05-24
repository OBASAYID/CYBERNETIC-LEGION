import type { PsharePost } from "./PshareFeedCard";

export function PshareProfileHeader({
  label,
  posts,
  avatarUrl,
  isMe,
  onUploadClick,
}: {
  label: string;
  posts: PsharePost[];
  avatarUrl?: string | null;
  isMe?: boolean;
  onUploadClick?: () => void;
}) {
  const mediaCount = posts.filter((p) => p.fileUrl).length;
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/40 p-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-14 w-14 rounded-full border border-white/15 object-cover ring-2 ring-cyan-500/20"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600/60 to-violet-600/50 text-lg font-bold text-white">
            {initials || "?"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-white">{label}</p>
          <p className="text-[11px] text-white/45">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
            {mediaCount > 0 && ` · ${mediaCount} with media`}
          </p>
        </div>
        {isMe && onUploadClick && (
          <button
            type="button"
            onClick={onUploadClick}
            className="shrink-0 rounded-full border border-cyan-500/35 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            + New
          </button>
        )}
      </div>
    </div>
  );
}
