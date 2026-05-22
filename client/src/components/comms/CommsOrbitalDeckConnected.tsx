/**
 * Fused orbital deck — contact hub actions wired to presence calls, mesh WebRTC,
 * chat console, and server conferences. Must render inside CommsP2PLayerProvider.
 */

import { useCallback, useState } from "react";
import {
  commsCreateAndJoinConference,
  type CommsConference,
} from "../../lib/comms-conference-api";
import {
  type OrbitalForwardSlot,
  writeOrbitalSlotPin,
} from "../../lib/comms-orbital-integration";
import type { ChatOutboundPayload } from "../../contexts/PresenceContext";
import { useCommsP2PLayer } from "./CommsP2PLayerContext";
import {
  CommsOrbitalCommandDeck,
  type OrbitalMainTab,
} from "./CommsOrbitalCommandDeck";

type Props = {
  darkMode: boolean;
  displayName: string;
  isConnected: boolean;
  mainUserPhotoUrl: string | null;
  onMainUserPhotoUpload: (file: File) => void;
  photoUploading: boolean;
  forwardSlots: OrbitalForwardSlot[];
  myId: string;
  activeTab: OrbitalMainTab;
  onSelectTab: (t: OrbitalMainTab) => void;
  setChatPanelOpen: (open: boolean) => void;
  setPendingConversationId: (id: string | null) => void;
  setSlotPinRevision: React.Dispatch<React.SetStateAction<number>>;
  callUser: (userId: string, userName: string, type: "audio" | "video") => void;
  presenceSendChatMessage: (targetUserId: string, payload: ChatOutboundPayload) => void;
  selectedPeerId?: string | null;
  onConferenceReady?: (conference: CommsConference) => void;
  onEmptySlotClick?: (slotIndex: number, refLabel: string) => void;
  serviceTitle?: string;
  serviceSubtitle?: string;
  className?: string;
};

function pinPeerAtSlot(
  forwardSlots: OrbitalForwardSlot[],
  userId: string,
  slotIndex: number | undefined,
  bumpPins: () => void,
): void {
  if (slotIndex !== undefined) {
    writeOrbitalSlotPin(slotIndex, userId);
    bumpPins();
    return;
  }
  const slot = forwardSlots.find((s) => s.peer?.id === userId);
  if (slot) {
    writeOrbitalSlotPin(slot.seatIndex, userId);
    bumpPins();
  }
}

export function CommsOrbitalDeckConnected({
  forwardSlots,
  myId,
  displayName,
  setChatPanelOpen,
  setPendingConversationId,
  setSlotPinRevision,
  callUser,
  presenceSendChatMessage,
  onSelectTab,
  onConferenceReady,
  onEmptySlotClick,
  selectedPeerId,
  ...deckProps
}: Props) {
  const { meshPeerIds, startMeshCall, linkConnected, linkJoined, inMeshCall } = useCommsP2PLayer();
  const [openHubPeerId, setOpenHubPeerId] = useState<string | null>(null);

  const meshReady = linkConnected && linkJoined;
  const bumpPins = useCallback(() => setSlotPinRevision((r) => r + 1), [setSlotPinRevision]);

  const syncPeerFocus = useCallback(
    (peerId: string | null) => {
      setOpenHubPeerId(peerId);
      if (peerId) setPendingConversationId(peerId);
    },
    [setPendingConversationId],
  );

  const handleHubPeerChange = useCallback(
    (peerId: string | null) => {
      syncPeerFocus(peerId);
    },
    [syncPeerFocus],
  );

  const handleOrbitalPeerCall = useCallback(
    (userId: string, userName: string, type: "audio" | "video") => {
      const slot = forwardSlots.find((s) => s.peer?.id === userId);
      pinPeerAtSlot(forwardSlots, userId, slot?.seatIndex, bumpPins);
      setPendingConversationId(userId);
      setOpenHubPeerId(null);

      if (meshReady && meshPeerIds.has(userId) && !inMeshCall) {
        void startMeshCall(userId, type === "video");
        onSelectTab("calls");
        setChatPanelOpen(false);
        return;
      }

      callUser(userId, userName, type);
    },
    [
      forwardSlots,
      bumpPins,
      setPendingConversationId,
      meshReady,
      meshPeerIds,
      inMeshCall,
      startMeshCall,
      onSelectTab,
      setChatPanelOpen,
      callUser,
    ],
  );

  const handleOrbitalPeerMessage = useCallback(
    (userId: string, _userName: string, slotIndex: number) => {
      pinPeerAtSlot(forwardSlots, userId, slotIndex, bumpPins);
      setPendingConversationId(userId);
      setOpenHubPeerId(null);
      onSelectTab("chat");
      setChatPanelOpen(true);
    },
    [forwardSlots, bumpPins, setPendingConversationId, onSelectTab, setChatPanelOpen],
  );

  const handleOrbitalPeerGroupCall = useCallback(
    async (userId: string, userName: string, slotIndex: number) => {
      pinPeerAtSlot(forwardSlots, userId, slotIndex, bumpPins);
      setPendingConversationId(userId);
      setOpenHubPeerId(null);
      onSelectTab("calls");
      setChatPanelOpen(false);

      const title = `Round table · ${userName}`;
      const { conference, error } = await commsCreateAndJoinConference({
        title,
        userName: displayName || "Host",
        maxParticipants: 20,
      });

      if (error || !conference) {
        console.error("Group call room create/join failed:", error);
        return;
      }

      onConferenceReady?.(conference);

      const inviteLine = conference.roomCode
        ? `🎙️ ${displayName} opened a round-table group call — room ${conference.roomCode}. Join from Calls → Conference.`
        : `🎙️ ${displayName} opened a round-table group call. Join from Calls → Conference.`;

      const inviteTargets = new Set<string>([userId]);
      for (const slot of forwardSlots) {
        const peer = slot.peer;
        if (peer?.isOnline && peer.id !== myId) inviteTargets.add(peer.id);
      }

      for (const targetId of inviteTargets) {
        presenceSendChatMessage(targetId, {
          message: inviteLine,
          messageType: "text",
          timestamp: new Date().toISOString(),
        });
      }
    },
    [
      forwardSlots,
      myId,
      displayName,
      bumpPins,
      setPendingConversationId,
      onSelectTab,
      setChatPanelOpen,
      onConferenceReady,
      presenceSendChatMessage,
    ],
  );

  const handleOrbitalHubActivate = useCallback(() => {
    onSelectTab("chat");
    setChatPanelOpen(true);
  }, [onSelectTab, setChatPanelOpen]);

  const handleEmptySlot = useCallback(
    (slotIndex: number, refLabel: string) => {
      setOpenHubPeerId(null);
      onEmptySlotClick?.(slotIndex, refLabel);
    },
    [onEmptySlotClick],
  );

  const handleOrbitalVideoInvite = useCallback(
    (userId: string, _userName: string) => {
      setPendingConversationId(userId);
      onSelectTab("chat");
      setChatPanelOpen(true);
      presenceSendChatMessage(userId, {
        message: `📹 ${displayName} invites you to a video session — open Calls when you're ready to connect.`,
        messageType: "text",
        timestamp: new Date().toISOString(),
      });
    },
    [displayName, presenceSendChatMessage, setPendingConversationId, onSelectTab, setChatPanelOpen],
  );

  const focusPeerId = openHubPeerId ?? selectedPeerId ?? null;

  return (
    <CommsOrbitalCommandDeck
      {...deckProps}
      forwardSlots={forwardSlots}
      displayName={displayName}
      selectedPeerId={focusPeerId}
      openHubPeerId={openHubPeerId}
      onHubPeerChange={handleHubPeerChange}
      onSelectTab={onSelectTab}
      onPeerCall={handleOrbitalPeerCall}
      onPeerMessage={handleOrbitalPeerMessage}
      onPeerGroupCall={handleOrbitalPeerGroupCall}
      onPeerVideoInvite={handleOrbitalVideoInvite}
      onEmptySlotClick={handleEmptySlot}
      onHubActivate={handleOrbitalHubActivate}
    />
  );
}
