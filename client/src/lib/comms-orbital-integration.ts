/**
 * Round-table presence — online users appear at seats; stable seat map;
 * pins for TAC/GTAC/RSPC/GSPC (+ overflow seats S5…).
 */

export const ORBITAL_PEER_LABELS = ["TAC", "GTAC", "RSPC", "GSPC"] as const;
export const ORBITAL_HUB_LABEL = "GSLC";
export const MAX_TABLE_PEER_SEATS = 9;

const PINS_KEY = "cyrus-comms-orbital-slot-pins";
const SEAT_MAP_KEY = "cyrus-comms-table-seat-map";

export type OrbitalSlotPeer = {
  id: string;
  displayName: string;
  inCall?: boolean;
  avatarUrl: string | null;
  isOnline: boolean;
};

export type OrbitalForwardSlot = {
  seatIndex: number;
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

function peerSeatLabel(seatIndex: number): string {
  return ORBITAL_PEER_LABELS[seatIndex] ?? `S${seatIndex + 1}`;
}

function readTableSeatMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SEAT_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && v >= 0 && v < MAX_TABLE_PEER_SEATS) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeTableSeatMap(map: Record<string, number>): void {
  try {
    localStorage.setItem(SEAT_MAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function nextFreeSeat(occupied: Set<number>): number | null {
  for (let i = 0; i < MAX_TABLE_PEER_SEATS; i++) {
    if (!occupied.has(i)) return i;
  }
  return null;
}

/**
 * Build table seats for every **online** peer (excluding operator).
 * When a user goes offline they are removed; when they return they reclaim a stable seat.
 */
export function buildOrbitalForwardSlots(input: {
  myId: string;
  onlineUsers: Array<{ id: string; displayName: string; inCall?: boolean }>;
  allUsers: Array<{ id: string; displayName: string; profileImageUrl?: string | null }>;
  contacts: Array<{ contactId: string; contactName: string }>;
  resolveAvatar: (id: string) => string | null;
  slotPins?: (string | null)[];
}): OrbitalForwardSlot[] {
  void input.contacts;
  void input.allUsers;

  const skip = new Set([input.myId, "cyrus-001"].filter(Boolean));
  const onlineOthers = input.onlineUsers.filter((u) => u.id && !skip.has(u.id));
  const onlineIds = new Set(onlineOthers.map((u) => u.id));
  const pins = input.slotPins ?? readOrbitalSlotPins();
  const seatMap = readTableSeatMap();
  const occupied = new Map<number, OrbitalForwardSlot>();
  const assigned = new Set<string>();

  const liveUser = (id: string) => onlineOthers.find((u) => u.id === id);

  const placeOnline = (userId: string, seatIndex: number) => {
    if (seatIndex < 0 || seatIndex >= MAX_TABLE_PEER_SEATS || occupied.has(seatIndex)) return;
    const live = liveUser(userId);
    if (!live) return;
    occupied.set(seatIndex, {
      seatIndex,
      refLabel: peerSeatLabel(seatIndex),
      peer: {
        id: userId,
        displayName: live.displayName,
        inCall: live.inCall,
        avatarUrl: input.resolveAvatar(userId),
        isOnline: true,
      },
    });
    assigned.add(userId);
    seatMap[userId] = seatIndex;
  };

  for (let i = 0; i < pins.length && i < MAX_TABLE_PEER_SEATS; i++) {
    const pinId = pins[i];
    if (pinId && onlineIds.has(pinId)) placeOnline(pinId, i);
  }

  for (const u of onlineOthers) {
    if (assigned.has(u.id)) continue;
    let seat = seatMap[u.id];
    if (seat === undefined || seat >= MAX_TABLE_PEER_SEATS || occupied.has(seat)) {
      const free = nextFreeSeat(new Set(occupied.keys()));
      if (free === null) continue;
      seat = free;
    }
    placeOnline(u.id, seat);
  }

  const pruned: Record<string, number> = {};
  for (const [userId, seat] of Object.entries(seatMap)) {
    if (onlineIds.has(userId)) pruned[userId] = seat;
  }
  writeTableSeatMap(pruned);

  return [...occupied.values()].sort((a, b) => a.seatIndex - b.seatIndex);
}
