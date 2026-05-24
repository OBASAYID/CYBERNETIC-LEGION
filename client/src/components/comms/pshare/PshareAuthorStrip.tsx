import type { PshareAuthorTab } from "../../../lib/pshare-utils";

export function PshareAuthorStrip({
  tabs,
  activeId,
  onSelect,
  getAvatarForUser,
  myUserId,
}: {
  tabs: PshareAuthorTab[];
  activeId: string;
  onSelect: (id: string) => void;
  getAvatarForUser?: (userId: string) => string | null | undefined;
  myUserId: string;
}) {
  // Only show per-user tabs once someone has published (strip is hidden when only "Everyone" exists).
  if (tabs.length <= 1) return null;

  return (
    <div className="mx-auto max-w-xl px-3 pb-2 sm:px-4">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/35">
        Creators with posts
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const active = activeId === tab.id;
          const avatarUserId =
            tab.id === "mine" ? myUserId : tab.id === "all" ? null : tab.id;
          const avatar = avatarUserId ? getAvatarForUser?.(avatarUserId) : null;
          const initials = tab.label.slice(0, 2).toUpperCase();

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition ${
                active
                  ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-50 ring-1 ring-cyan-400/30"
                  : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white/90"
              }`}
            >
              {tab.id === "all" ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/50 to-cyan-600/40 text-[10px] font-bold">
                  ALL
                </span>
              ) : avatar ? (
                <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/15" />
              ) : (
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                    tab.isMe
                      ? "bg-gradient-to-br from-cyan-600/60 to-violet-600/50"
                      : "bg-white/10"
                  }`}
                >
                  {initials}
                </span>
              )}
              <span className="min-w-0">
                <span className="block max-w-[6rem] truncate text-[11px] font-semibold">{tab.label}</span>
                <span className="block text-[9px] text-white/40">
                  {tab.postCount} {tab.postCount === 1 ? "post" : "posts"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
