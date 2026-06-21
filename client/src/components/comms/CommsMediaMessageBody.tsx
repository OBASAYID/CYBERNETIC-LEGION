import type { MutableRefObject } from "react";
import { commsAssetUrl } from "@shared/cyrus-api-client";
import { formatCommsFileSize } from "@shared/comms/media-formats";
import { isCommsCad3dFile } from "../../lib/comms-cad-formats";
import { CommsCad3dAttachment } from "./CommsCad3dAttachment";
import { CommsMediaComments } from "./CommsMediaComments";

export type CommsMediaMessageFields = {
  message?: string;
  messageType?: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  sharedMediaId?: string;
  voiceDurationSeconds?: number;
};

type CommsMediaMessageBodyProps = {
  msg: CommsMediaMessageFields;
  holoSurface?: boolean;
  compact?: boolean;
  /** Active call / group room — enables team comments on CAD & heavy files */
  roomId?: string;
  currentUserId?: string;
  currentUserName?: string;
  socketRef?: MutableRefObject<{ emit: (event: string, payload: unknown) => void; connected?: boolean } | null>;
};

export function CommsMediaMessageBody({
  msg,
  holoSurface = false,
  compact = false,
  roomId,
  currentUserId,
  currentUserName,
  socketRef,
}: CommsMediaMessageBodyProps) {
  const mediaUrl = msg.fileUrl ? commsAssetUrl(msg.fileUrl) ?? msg.fileUrl : null;
  const mt = msg.messageType || "text";
  const mime = msg.fileMimeType || "";
  const caption = (msg.message || "").trim();

  if (mediaUrl && (mt === "voice-note")) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-wide text-white/40">Voice note</p>
        <audio src={mediaUrl} controls className="w-full max-w-sm rounded-lg" preload="metadata" />
        {msg.voiceDurationSeconds != null && msg.voiceDurationSeconds > 0 ? (
          <p className="text-[9px] text-white/30">
            {Math.floor(msg.voiceDurationSeconds / 60)}:
            {String(msg.voiceDurationSeconds % 60).padStart(2, "0")}
          </p>
        ) : null}
      </div>
    );
  }

  if (mediaUrl && (mt === "cad-3d" || isCommsCad3dFile(msg.fileName, mime))) {
    const downloadUrl = mediaUrl.includes("?") ? `${mediaUrl}&download=1` : `${mediaUrl}?download=1`;
    return (
      <div className="space-y-2">
        <CommsCad3dAttachment
          url={mediaUrl}
          downloadUrl={downloadUrl}
          fileName={msg.fileName}
          mimeType={mime}
          caption={caption}
          holoSurface={holoSurface}
          compact={compact}
        />
        {(msg.sharedMediaId || msg.fileUrl) && roomId && currentUserId ? (
          <CommsMediaComments
            mediaId={msg.sharedMediaId}
            fileUrl={msg.fileUrl}
            roomId={roomId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            socketRef={socketRef}
          />
        ) : null}
      </div>
    );
  }

  if (mediaUrl && mime.startsWith("image/")) {
    return (
      <div className="space-y-1.5">
        <a href={mediaUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
          <img
            src={mediaUrl}
            alt={msg.fileName || "Shared image"}
            className={`w-full rounded-lg object-cover ${compact ? "max-h-36" : "max-h-48"}`}
            loading="lazy"
          />
        </a>
        {caption ? <p className="text-[12px] leading-relaxed text-white/70">{caption}</p> : null}
      </div>
    );
  }

  if (mediaUrl && (mime.startsWith("video/") || (mt === "media" && mime.startsWith("video")))) {
    return (
      <div className="space-y-1.5">
        <video
          src={mediaUrl}
          controls
          playsInline
          className={`w-full max-w-sm rounded-lg bg-black/40 ${compact ? "max-h-36" : ""}`}
          preload="metadata"
        />
        {caption ? <p className="text-[12px] leading-relaxed text-white/70">{caption}</p> : null}
      </div>
    );
  }

  if (mediaUrl && mime.startsWith("audio/")) {
    return (
      <div className="space-y-1.5">
        <audio src={mediaUrl} controls className="w-full max-w-sm rounded-lg" preload="metadata" />
        {caption ? <p className="text-[12px] leading-relaxed text-white/70">{caption}</p> : null}
      </div>
    );
  }

  if (mediaUrl) {
    const sizeLabel = msg.fileSizeBytes ? formatCommsFileSize(msg.fileSizeBytes) : "";
    return (
      <div className="space-y-1.5">
        <a
          href={mediaUrl.includes("?") ? `${mediaUrl}&download=1` : `${mediaUrl}?download=1`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] underline"
          style={{ color: holoSurface ? "rgba(130,207,255,0.85)" : "rgba(251,191,36,0.9)" }}
        >
          📎 {msg.fileName || "Shared file"}
          {sizeLabel ? ` · ${sizeLabel}` : ""}
        </a>
        {caption ? <p className="text-[12px] leading-relaxed text-white/70">{caption}</p> : null}
        {(msg.sharedMediaId || msg.fileUrl) && roomId && currentUserId ? (
          <CommsMediaComments
            mediaId={msg.sharedMediaId}
            fileUrl={msg.fileUrl}
            roomId={roomId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            socketRef={socketRef}
          />
        ) : null}
      </div>
    );
  }

  return <p className="text-[12px] leading-relaxed text-white/70">{msg.message || ""}</p>;
}
