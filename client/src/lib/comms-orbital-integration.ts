/**
 * Orbital presence arc — slot labels, pin persistence, and peer assignment
 * (online roster, contacts, pinned users per TAC/GTAC/RSPC/GSPC).
 */

export const ORBITAL_PEER_LABELS = ["TAC", "GTAC", "RSPC", "GSPC"] as const;
export const ORBITAL_HUB_LABEL = "GSLC";

const PINS_KEY = "cyrus-comms-orbital-slot-pins";

export type OrbitalSlotPeer = {
  id: string;
  displayName: string;
  inCall?: boolean;
  avatarUrl: string | null;
  isOnline: boolean;
};

export type OrbitalForwardSlot = {
  refLabel: string;
  peer: OrbitalSlotPeer | null;
};

export function readOrbitalSlotPins(): (string | null)[] {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    if (!raw) return ORBITAL_PEER_LABELS.map(() => null);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ORBITAL_PEER_LABELS.map(() => null);
    return ORBITAL_PEER_LABELS.map((_, i) =>
      typeof parsed[i] === "string" && parsed[i].trim() ? parsed[i].trim() : null,
    );
  } catch {
    return ORBITAL_PEER_LABELS.map(() => null);
  }
}

export function writeOrbitalSlotPin(slotIndex: number, userId: string | null): void {
  if (slotIndex < 0 || slotIndex >= ORBITAL_PEER_LABELS.length) return;
  const pins = readOrbitalSlotPins();
  pins[slotIndex] = userId;
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  } catch {
    /* ignore */
  }
}

export function buildOrbitalForwardSlots(input: {
  myId: string;
  onlineUsers: Array<{ id: string; displayName: string; inCall?: boolean }>;
  allUsers: Array<{ id: string; displayName: string; profileImageUrl?: string | null }>;
  contacts: Array<{ contactId: string; contactName: string }>;
  resolveAvatar: (id: string) => string | null;
  slotPins?: (string | null)[];
}): OrbitalForwardSlot[] {
  const skip = new Set([input.myId, "cyrus-001"].filter(Boolean));
  const onlineById = new Map(input.onlineUsers.map((u) => [u.id, u]));
  const pins = input.slotPins ?? readOrbitalSlotPins();
  const assigned = new Map<number, OrbitalSlotPeer>();
  const seen = new Set<string>();

  const toPeer = (id: string, displayName: string): OrbitalSlotPeer => {
    const live = onlineById.get(id);
    return {
      id,
      displayName: live?.displayName ?? displayName,
      inCall: live?.inCall,
      avatarUrl: input.resolveAvatar(id),
      isOnline: !!live,
    };
  };

  const claim = (id: string, displayName: string): OrbitalSlotPeer | null => {
    if (!id || skip.has(id) || seen.has(id)) return null;
    seen.add(id);
    return toPeer(id, displayName);
  };

  // Pinned users occupy their slot index first.
  for (let i = 0; i < ORBITAL_PEER_LABELS.length; i++) {
    const pinId = pins[i];
    if (!pinId) continue;
    const fromAll = input.allUsers.find((u) => u.id === pinId);
    const fromOnline = onlineById.get(pinId);
    const peer = claim(pinId, fromOnline?.displayName ?? fromAll?.displayName ?? pinId);
    if (peer) assigned.set(i, peer);
  }

  const fillNext = (id: string, displayName: string) => {
    const peer = claim(id, displayName);
    if (!peer) return;
    for (let i = 0; i < ORBITAL_PEER_LABELS.length; i++) {
      if (!assigned.has(i)) {
        assigned.set(i, peer);
        return;
      }
    }
  };

  for (const u of input.onlineUsers) fillNext(u.id, u.displayName);
  for (const c of input.contacts) fillNext(c.contactId, c.contactName);
  for (const u of input.allUsers) fillNext(u.id, u.displayName);

  return ORBITAL_PEER_LABELS.map((refLabel, i) => ({
    refLabel,
    peer: assigned.get(i) ?? null,
  }));
}
