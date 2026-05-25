/**
 * CallNotification — floating incoming-call banner.
 *
 * Renders as a fixed overlay at the top of the viewport so it is visible
 * regardless of which page the user is on.  Plays a ringtone (Web Audio API
 * oscillator — no asset required) and auto-dismisses after 2 min if unanswered.
 */

import { useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { IncomingCallInfo } from "@/hooks/useWebRTC";

interface CallNotificationProps {
  call: IncomingCallInfo;
  onAccept: () => void;
  onReject: () => void;
}

/** Simple oscillator-based ringtone — no audio file needed. */
function useRingtone(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playRing = useCallback(() => {
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext may be blocked before user interaction — silently ignore
    }
  }, []);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    playRing();
    intervalRef.current = setInterval(playRing, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, [active, playRing]);
}

/** Auto-dismiss after `timeoutMs` ms by calling onReject. */
function useAutoDismiss(active: boolean, timeoutMs: number, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(t);
  }, [active, timeoutMs, onDismiss]);
}

export function CallNotification({ call, onAccept, onReject }: CallNotificationProps) {
  useRingtone(true);
  useAutoDismiss(true, 120_000, onReject);

  const isVideo = call.callType === "video";
  const initial = call.callerName?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      className="fixed z-[200] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-primary/40 bg-slate-900/95 shadow-2xl shadow-primary/20 backdrop-blur-md animate-in slide-in-from-top-4 duration-300 cyrus-safe-fixed-top"
      style={{ right: "max(1rem, env(safe-area-inset-right, 0px))" }}
      role="alertdialog"
      aria-label={`Incoming ${isVideo ? "video" : "audio"} call from ${call.callerName}`}
    >
      {/* Pulsing accent bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Avatar className="w-14 h-14 border-2 border-primary/50">
              <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            {/* Ripple */}
            <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">{call.callerName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isVideo ? (
                <Video className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Phone className="w-3.5 h-3.5 text-primary" />
              )}
              <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0">
                {isVideo ? "VIDEO CALL" : "VOICE CALL"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">Incoming…</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1 rounded-full gap-2"
            onClick={onReject}
            data-testid="btn-reject-call"
          >
            <PhoneOff className="w-4 h-4" />
            Decline
          </Button>
          <Button
            className="flex-1 rounded-full gap-2 bg-green-600 hover:bg-green-700 text-white border-0"
            onClick={onAccept}
            data-testid="btn-accept-call"
          >
            <Phone className="w-4 h-4" />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
