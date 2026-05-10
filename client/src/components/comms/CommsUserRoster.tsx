import { useRef } from "react";
import { User } from "lucide-react";
import { commsAssetUrl } from "@shared/cyrus-api-client";

export interface RosterUser {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  isOnline: boolean;
}

interface CommsUserRosterProps {
  users: RosterUser[];
  myUserId: string;
  onUploadAvatar: (file: File) => void;
  isUploading?: boolean;
  /** New-chat flow: click rows to select recipients (bright green when selected). */
  pickMode?: boolean;
  pickedUserIds?: string[];
  onTogglePick?: (userId: string) => void;
  holoSurface?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CommsUserRoster({
  users,
  myUserId,
  onUploadAvatar,
  isUploading,
  pickMode = false,
  pickedUserIds = [],
  onTogglePick,
  holoSurface = false,
}: CommsUserRosterProps) {
  const picked = new Set(pickedUserIds);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...users].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });

  return (
    <div
      className={`flex h-full min-h-0 flex-col border-l ${
        holoSurface
          ? "border-cyan-400/35 bg-gradient-to-b from-slate-950/55 via-cyan-950/12 to-violet-950/15"
          : "border-amber-500/25 bg-gradient-to-b from-slate-950/50 via-orange-950/12 to-cyan-950/20"
      }`}
    >
      <div className="shrink-0 space-y-1 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
        <h2
          className={`text-xs font-bold uppercase tracking-[0.2em] ${holoSurface ? "text-cyan-200/80" : "text-amber-200/75"}`}
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          Network
        </h2>
        <p className={`text-[10px] ${holoSurface ? "text-cyan-200/45" : "text-amber-200/45"}`}>
          {pickMode ? "Tap users to add to this chat (green = selected)" : "All users · online or offline"}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadAvatar(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {isUploading ? "Uploading…" : "Your photo — upload"}
        </button>
      </div>

      <div
        className={`min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-1 scrollbar-thin scrollbar-track-transparent ${
          holoSurface ? "scrollbar-thumb-cyan-900/45" : "scrollbar-thumb-amber-900/45"
        }`}
      >
        {sorted.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-8 text-center ${holoSurface ? "text-cyan-200/50" : "text-amber-200/50"}`}>
            <User className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-xs">No users in directory yet</p>
          </div>
        ) : (
          sorted.map((u) => {
            const isMe = u.id === myUserId;
            const isPicked = !isMe && pickMode && picked.has(u.id);
            return (
              <div
                key={u.id}
                role={pickMode && !isMe ? "button" : undefined}
                tabIndex={pickMode && !isMe ? 0 : undefined}
                onClick={
                  pickMode && !isMe && onTogglePick
                    ? () => onTogglePick(u.id)
                    : undefined
                }
                onKeyDown={
                  pickMode && !isMe && onTogglePick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onTogglePick(u.id);
                        }
                      }
                    : undefined
                }
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
                  isPicked
                    ? "border-lime-400/90 bg-lime-500/10 shadow-[0_0_20px_8px_rgba(74,222,128,0.5),0_0_2px_1px_rgba(34,197,94,0.8)]"
                    : isMe
                      ? "border-cyan-400/35 bg-cyan-500/10"
                      : holoSurface
                        ? "border-transparent bg-slate-950/30 hover:border-cyan-500/22"
                        : "border-transparent bg-slate-950/30 hover:border-amber-500/18"
                } ${pickMode && !isMe ? "cursor-pointer" : ""}`}
              >
                <div className="relative h-9 w-9 shrink-0">
                  {u.profileImageUrl ? (
                    <img
                      src={commsAssetUrl(u.profileImageUrl) ?? u.profileImageUrl}
                      alt=""
                      className={`h-9 w-9 rounded-full object-cover ${
                        isPicked
                          ? "ring-[3px] ring-lime-400 shadow-[0_0_12px_4px_rgba(74,222,128,0.7)]"
                          : holoSurface
                            ? "ring-2 ring-cyan-400/35"
                            : "ring-2 ring-amber-500/30"
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                        holoSurface
                          ? "bg-gradient-to-br from-cyan-600/55 to-violet-600/48 "
                          : "bg-gradient-to-br from-amber-600/55 to-cyan-600/50 "
                      } ${
                        isPicked ? "ring-[3px] ring-lime-400 shadow-[0_0_12px_4px_rgba(74,222,128,0.7)]" : ""
                      }`}
                    >
                      {initials(u.displayName)}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
                      u.isOnline ? "bg-lime-400 shadow-[0_0_5px_#a3e635]" : "bg-slate-600"
                    }`}
                    title={u.isOnline ? "Online" : "Offline"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-medium ${holoSurface ? "text-cyan-50" : "text-amber-50"}`}>
                    {u.displayName}
                    {isMe && <span className="ml-1 text-[9px] font-normal text-cyan-200/80">(you)</span>}
                  </p>
                  <p className={`text-[10px] ${holoSurface ? "text-cyan-200/40" : "text-amber-200/40"}`}>
                    {u.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
