/** Shared SFU / group-call types (server + client). */

export type CyrusSfuMode = "mediasoup" | "star" | "p2p";

export type GroupCallParticipant = {
  peerId: string;
  displayName: string;
};

export type GroupCallSessionInfo = {
  roomId: string;
  callType: "audio" | "video";
  hostPeerId: string;
  sfuMode: CyrusSfuMode;
  participants: string[];
};

export type SfuStatusResponse = {
  mode: CyrusSfuMode;
  mediasoupAvailable: boolean;
  relayConfigured: boolean;
  maxParticipants: number;
  announcedIp?: string | null;
  rtcPortRange?: { min: number; max: number };
  workerBin?: string | null;
};
