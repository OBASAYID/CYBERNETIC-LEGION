/**
 * CallDialog — modal for initiating a call to a selected user.
 *
 * Shown when the user clicks a call button on a contact/user card.
 * Lets the caller choose audio vs video before dialling.
 */

import { Phone, Video, X, Wifi } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { OnlineUser, CallType } from "@/hooks/useWebRTC";

interface CallDialogProps {
  /** The user to call. Pass `null` to close the dialog. */
  targetUser: OnlineUser | null;
  onClose: () => void;
  onCall: (userId: string, callType: CallType) => void;
}

function statusColor(status: OnlineUser["status"]): string {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "busy":
      return "bg-yellow-500";
    case "in_call":
      return "bg-[#e11d48]";
    default:
      return "bg-slate-500";
  }
}

function statusLabel(status: OnlineUser["status"]): string {
  switch (status) {
    case "online":
      return "Online";
    case "busy":
      return "Busy";
    case "in_call":
      return "In call";
    default:
      return "Offline";
  }
}

export function CallDialog({ targetUser, onClose, onCall }: CallDialogProps) {
  const isOpen = targetUser !== null;
  const initial = targetUser?.name?.[0]?.toUpperCase() ?? "?";
  const canCall = targetUser?.status === "online";

  const handleCall = (callType: CallType) => {
    if (!targetUser) return;
    onCall(targetUser.id, callType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-wide">INITIATE CALL</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Select call type to connect with this device.
          </DialogDescription>
        </DialogHeader>

        {targetUser && (
          <div className="flex flex-col items-center gap-6 py-2">
            {/* User card */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-primary/40">
                  {targetUser.profileImageUrl ? (
                    <img
                      src={targetUser.profileImageUrl}
                      alt={targetUser.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                      {initial}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${statusColor(targetUser.status)}`}
                />
              </div>

              <div className="text-center">
                <p className="font-bold text-lg">{targetUser.name}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Wifi className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs font-mono">
                    {statusLabel(targetUser.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Call type buttons */}
            {canCall ? (
              <div className="flex gap-4 w-full">
                <Button
                  className="flex-1 gap-2 rounded-xl h-14 bg-green-600 hover:bg-green-700 text-white border-0"
                  onClick={() => handleCall("voice")}
                  data-testid="btn-start-audio-call"
                >
                  <Phone className="w-5 h-5" />
                  <span className="font-mono text-sm">VOICE</span>
                </Button>
                <Button
                  className="flex-1 gap-2 rounded-xl h-14 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  onClick={() => handleCall("video")}
                  data-testid="btn-start-video-call"
                >
                  <Video className="w-5 h-5" />
                  <span className="font-mono text-sm">VIDEO</span>
                </Button>
              </div>
            ) : (
              <div className="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {targetUser.status === "in_call"
                    ? "This user is currently in another call."
                    : "This user is not available right now."}
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-white"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
