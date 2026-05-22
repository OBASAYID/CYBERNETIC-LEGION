/**
 * NEXUS round-table — operator at front; each **online** user pops into a seat dynamically.
 */

import { Suspense, useId, useRef, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, Grid, Html } from "@react-three/drei";
import * as THREE from "three";

import { ORBITAL_HUB_LABEL, type OrbitalForwardSlot } from "../../lib/comms-orbital-integration";
import { CommsContactHubPopover } from "./CommsContactHubPopover";

export type ForwardOrbitSlot = OrbitalForwardSlot;

type Props = {
  orbitPhaseRef: React.MutableRefObject<number>;
  darkMode: boolean;
  forwardSlots: ForwardOrbitSlot[];
  mainUserPhotoUrl: string | null;
  displayName: string;
  photoUploading: boolean;
  onPhotoClick: () => void;
  onPeerCall: (peerId: string, peerName: string, type: "audio" | "video") => void;
  onPeerMessage?: (peerId: string, peerName: string, slotIndex: number) => void;
  onPeerGroupCall?: (peerId: string, peerName: string, slotIndex: number) => void;
  onPeerVideoInvite?: (peerId: string, peerName: string) => void;
  selectedPeerId?: string | null;
  openHubPeerId?: string | null;
  onHubPeerChange?: (peerId: string | null) => void;
  onEmptySlotClick?: (slotIndex: number, refLabel: string) => void;
  onHubActivate?: () => void;
};

const CYAN = "#00e5ff";
const TABLE_RADIUS = 1.05;
const SEAT_RADIUS = 2.35;
const TABLE_Y = 0.38;
const OPERATOR_ANGLE = 0;

const HTML: CSSProperties = { pointerEvents: "auto", userSelect: "none" };

function seatXZ(angle: number): { x: number; z: number } {
  return { x: Math.sin(angle) * SEAT_RADIUS, z: Math.cos(angle) * SEAT_RADIUS };
}

function peerSeatAngles(peerCount: number): number[] {
  if (peerCount <= 0) return [];
  const step = (Math.PI * 2) / (peerCount + 1);
  return Array.from({ length: peerCount }, (_, i) => step * (i + 1));
}

function PerspectiveFloor({ darkMode }: { darkMode: boolean }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <Grid
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.65}
        sectionSize={2.5}
        sectionThickness={1.15}
        fadeDistance={28}
        fadeStrength={1.1}
        cellColor={darkMode ? "#0ea5e9" : "#0284c7"}
        sectionColor={darkMode ? "#22d3ee" : "#0ea5e9"}
      />
    </group>
  );
}

function ConferenceTable({ onlineCount }: { onlineCount: number }) {
  return (
    <group position={[0, TABLE_Y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[TABLE_RADIUS, 64]} />
        <meshStandardMaterial
          color="#3d2817"
          metalness={0.35}
          roughness={0.28}
          emissive="#1a0f08"
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[TABLE_RADIUS * 0.92, TABLE_RADIUS * 1.02, 64]} />
        <meshBasicMaterial
          color={CYAN}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[TABLE_RADIUS * 0.88, 48]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <pointLight color={CYAN} intensity={1.4 + onlineCount * 0.12} distance={4} position={[0, 0.5, 0]} />
    </group>
  );
}

function ChairMesh() {
  return (
    <group position={[0, 0.18, 0.35]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.38, -0.12]}>
        <boxGeometry args={[0.42, 0.42, 0.06]} />
        <meshStandardMaterial color="#0f172a" metalness={0.35} roughness={0.55} />
      </mesh>
    </group>
  );
}

function HoloLaptop() {
  return (
    <mesh position={[0, TABLE_Y + 0.04, -0.55]} rotation={[-0.35, 0, 0]}>
      <boxGeometry args={[0.38, 0.02, 0.28]} />
      <meshStandardMaterial color="#0a1628" emissive={CYAN} emissiveIntensity={0.35} metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

function HumanSilhouette({ initial }: { initial: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-end overflow-hidden bg-gradient-to-b from-[#1e3a5f] via-[#0f2744] to-[#081018] pb-[8%]">
      <svg viewBox="0 0 100 130" className="h-[88%] w-[85%]" aria-hidden>
        <defs>
          <linearGradient id={`skin-${gid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="32" rx="17" ry="19" fill={`url(#skin-${gid})`} opacity="0.95" />
        <path d="M22 128 C22 88 38 72 50 68 C62 72 78 88 78 128 Z" fill="#475569" opacity="0.92" />
        <path d="M30 128 L30 95 Q50 82 70 95 L70 128 Z" fill="#334155" />
      </svg>
      <span className="absolute bottom-2 text-lg font-semibold text-cyan-100/90">{initial}</span>
    </div>
  );
}

function HoloDataPanel({ inCall }: { inCall?: boolean }) {
  const bars = [0.45, 0.72, 0.55, 0.88, 0.62];
  return (
    <div className="mt-1 w-full rounded border border-cyan-500/40 bg-[#021018]/90 px-1 py-1">
      <div className="flex h-5 items-end justify-center gap-0.5">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-1 rounded-sm ${inCall ? "bg-fuchsia-400/80" : "bg-cyan-400/75"}`}
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
      <p className="mt-0.5 text-center font-mono text-[5px] uppercase tracking-wider text-emerald-400/80">
        {inCall ? "In call" : "Online"}
      </p>
    </div>
  );
}

function PortraitSeatCard({
  refLabel,
  displayName,
  avatarUrl,
  inCall,
  isHub,
  isSelected,
  hubOpen,
  photoUploading,
  onPhotoClick,
  onHubActivate,
  onPeerCall,
  onPeerMessage,
  onPeerGroupCall,
  onHubToggle,
  peerId,
  seatIndex,
}: {
  refLabel: string;
  displayName: string;
  avatarUrl: string | null;
  inCall?: boolean;
  isHub: boolean;
  isSelected?: boolean;
  hubOpen?: boolean;
  photoUploading?: boolean;
  onPhotoClick?: () => void;
  onHubActivate?: () => void;
  onPeerCall?: (peerId: string, peerName: string, type: "audio" | "video") => void;
  onPeerMessage?: (peerId: string, peerName: string, slotIndex: number) => void;
  onPeerGroupCall?: (peerId: string, peerName: string, slotIndex: number) => void;
  onHubToggle?: () => void;
  peerId?: string;
  seatIndex?: number;
}) {
  const initial = (displayName.trim().charAt(0) || "?").toUpperCase();
  const width = isHub ? "min(112px,21vw)" : "min(96px,18vw)";
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className={`group relative flex flex-col overflow-visible border-2 shadow-[0_0_32px_rgba(0,229,255,0.35)] ${
        isHub ? "sm:w-[118px]" : "sm:w-[102px]"
      } ${hubOpen || isSelected ? "border-cyan-200 ring-2 ring-cyan-300/45" : "border-cyan-400/65"}`}
      style={{
        width,
        background: "linear-gradient(165deg, rgba(0,28,52,0.95) 0%, rgba(0,8,16,0.98) 100%)",
        animation: "commsSeatPop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <div className="border-b border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 to-slate-950/80 px-2 py-0.5 text-center">
        <span className="font-mono text-[6px] font-bold uppercase tracking-[0.16em] text-cyan-50 sm:text-[7px]">
          {refLabel}
        </span>
      </div>

      {!isHub && peerId && seatIndex !== undefined && onHubToggle ? (
        <CommsContactHubPopover
          displayName={displayName}
          refLabel={refLabel}
          avatarUrl={avatarUrl}
          inCall={inCall}
          open={!!hubOpen}
          onClose={() => onHubToggle()}
          anchorRef={cardRef}
          onVoice={() => onPeerCall?.(peerId, displayName, "audio")}
          onVideo={() => onPeerCall?.(peerId, displayName, "video")}
          onText={() => onPeerMessage?.(peerId, displayName, seatIndex)}
          onGroup={() => onPeerGroupCall?.(peerId, displayName, seatIndex)}
        />
      ) : null}

      <button
        type="button"
        disabled={isHub && photoUploading}
        onClick={
          isHub
            ? onPhotoClick
            : peerId && onHubToggle
              ? onHubToggle
              : undefined
        }
        className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden hover:brightness-110"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover object-top" draggable={false} />
        ) : (
          <HumanSilhouette initial={initial} />
        )}
        <span
          className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor] ${
            inCall ? "bg-fuchsia-400" : "animate-pulse bg-emerald-400"
          }`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#020810] to-transparent" />
      </button>

      <div className="border-t border-cyan-500/25 px-1.5 py-1">
        <p className="truncate text-center text-[8px] font-semibold text-white sm:text-[9px]">{displayName}</p>
        <HoloDataPanel inCall={inCall} />
      </div>

      {isHub ? (
        <div className="flex justify-center gap-1 border-t border-cyan-500/20 px-1 py-1">
          <button
            type="button"
            className="rounded border border-cyan-500/45 px-1.5 py-0.5 text-[6px] text-cyan-100"
            onClick={onHubActivate}
          >
            Console
          </button>
          <button
            type="button"
            className="rounded border border-violet-500/40 px-1.5 py-0.5 text-[6px] text-violet-100"
            onClick={onPhotoClick}
          >
            Photo
          </button>
        </div>
      ) : (
        <p className="border-t border-cyan-500/15 py-0.5 text-center font-mono text-[5px] uppercase tracking-wider text-cyan-400/55">
          Tap for contact hub
        </p>
      )}
    </div>
  );
}

function TableSeat({
  angle,
  slot,
  isHub,
  mainUserPhotoUrl,
  displayName,
  photoUploading,
  selectedPeerId,
  openHubPeerId,
  onHubToggle,
  onPhotoClick,
  onPeerCall,
  onPeerMessage,
  onPeerGroupCall,
  onHubActivate,
}: {
  angle: number;
  slot: OrbitalForwardSlot | null;
  isHub: boolean;
  mainUserPhotoUrl: string | null;
  displayName: string;
  photoUploading: boolean;
  selectedPeerId?: string | null;
  openHubPeerId?: string | null;
  onHubToggle?: (peerId: string) => void;
  onPhotoClick: () => void;
  onPeerCall: Props["onPeerCall"];
  onPeerMessage?: Props["onPeerMessage"];
  onPeerGroupCall?: Props["onPeerGroupCall"];
  onHubActivate?: Props["onHubActivate"];
}) {
  const { x, z } = seatXZ(angle);
  const peer = slot?.peer ?? null;
  const refLabel = isHub ? ORBITAL_HUB_LABEL : slot?.refLabel ?? "—";
  const name = isHub ? displayName : peer?.displayName ?? "—";

  return (
    <group position={[x, 0, z]} rotation={[0, angle + Math.PI, 0]}>
      <ChairMesh />
      <HoloLaptop />
      <Billboard follow position={[0, isHub ? 1.02 : 0.92, 0]}>
        <Html center distanceFactor={isHub ? 8.8 : 8.2} style={HTML} zIndexRange={[110, 0]}>
          <PortraitSeatCard
            refLabel={refLabel}
            displayName={name}
            avatarUrl={isHub ? mainUserPhotoUrl : peer?.avatarUrl ?? null}
            inCall={peer?.inCall}
            isHub={isHub}
            isSelected={!!peer?.id && peer.id === selectedPeerId}
            hubOpen={!!peer?.id && peer.id === openHubPeerId}
            photoUploading={photoUploading}
            onPhotoClick={onPhotoClick}
            onHubActivate={onHubActivate}
            onPeerCall={onPeerCall}
            onPeerMessage={onPeerMessage}
            onPeerGroupCall={onPeerGroupCall}
            onHubToggle={peer?.id && onHubToggle ? () => onHubToggle(peer.id) : undefined}
            peerId={peer?.id}
            seatIndex={slot?.seatIndex}
          />
        </Html>
      </Billboard>
    </group>
  );
}

function SceneInner(props: Props) {
  const {
    darkMode,
    forwardSlots,
    displayName,
    mainUserPhotoUrl,
    photoUploading,
    selectedPeerId,
    openHubPeerId,
    onHubPeerChange,
    ...handlers
  } = props;

  const onlinePeers = forwardSlots.filter((s) => s.peer?.isOnline);
  const angles = peerSeatAngles(onlinePeers.length);

  const toggleHub = (peerId: string) => {
    if (!onHubPeerChange) return;
    onHubPeerChange(openHubPeerId === peerId ? null : peerId);
  };

  return (
    <group rotation={[-0.12, 0, 0]}>
      <PerspectiveFloor darkMode={darkMode} />
      <ambientLight intensity={0.22} color="#cfe" />
      <directionalLight position={[3, 10, 5]} intensity={0.55} color="#fff" />
      <directionalLight position={[-4, 6, -2]} intensity={0.18} color="#0ea5e9" />
      <ConferenceTable onlineCount={onlinePeers.length} />
      <Billboard follow position={[0, TABLE_Y + 0.55, 0]}>
        <Html center distanceFactor={10} style={{ pointerEvents: "none" }} zIndexRange={[90, 0]}>
          <div className="whitespace-nowrap rounded-full border border-cyan-500/35 bg-[#021018]/85 px-3 py-1 text-center shadow-[0_0_20px_rgba(0,229,255,0.3)]">
            <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-cyan-300/75">
              {onlinePeers.length === 0
                ? "NEXUS round table · awaiting peers"
                : `${onlinePeers.length} online at the table`}
            </p>
          </div>
        </Html>
      </Billboard>

      <TableSeat
        angle={OPERATOR_ANGLE}
        slot={null}
        isHub
        mainUserPhotoUrl={mainUserPhotoUrl}
        displayName={displayName}
        photoUploading={photoUploading}
        selectedPeerId={selectedPeerId}
        openHubPeerId={openHubPeerId}
        onHubToggle={toggleHub}
        {...handlers}
      />

      {onlinePeers.map((slot, i) => (
        <TableSeat
          key={slot.peer!.id}
          angle={angles[i] ?? 0}
          slot={slot}
          isHub={false}
          mainUserPhotoUrl={null}
          displayName={slot.peer!.displayName}
          photoUploading={false}
          selectedPeerId={selectedPeerId}
          openHubPeerId={openHubPeerId}
          onHubToggle={toggleHub}
          {...handlers}
        />
      ))}
    </group>
  );
}

export function CommsOrbitalScene3D(props: Props) {
  const dpr = typeof window !== "undefined" ? Math.min(2.25, window.devicePixelRatio || 1) : 1.5;
  return (
    <>
      <style>{`
        @keyframes commsSeatPop {
          from { opacity: 0; transform: scale(0.55) translateY(18px); filter: blur(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
      `}</style>
      <Canvas
        dpr={[1, dpr]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 3.8, 5.8], fov: 44, near: 0.08, far: 120 }}
        style={{ width: "100%", height: "100%", display: "block" }}
        onCreated={({ gl, scene, camera }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
          camera.lookAt(0, 0.45, 0);
        }}
      >
        <Suspense fallback={null}>
          <SceneInner {...props} />
        </Suspense>
      </Canvas>
    </>
  );
}
