/**
 * NEXUS round-table — operator always seated; each online peer pops into a seat dynamically.
 * 3D reference-style figures + functional laptop screens + contact hub on tap.
 */

import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Billboard, ContactShadows, Grid, Html } from "@react-three/drei";
import * as THREE from "three";

import { ORBITAL_HUB_LABEL, type OrbitalForwardSlot } from "../../lib/comms-orbital-integration";
import { CommsContactHubPopover } from "./CommsContactHubPopover";
import { COMMS_NEXUS_KEYFRAMES } from "./comms-nexus-motion";
import { AnimatedSeatBody } from "./CommsRoundTableSeatAnimation";
import {
  ConferenceLaptop,
  OfficeChair,
  RoundTable,
  StudioEnvironment,
  StylizedAvatarFigure,
  seatIndexToAngle,
  seatXZ,
} from "./CommsRoundTableModels";

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
  /** studio = reference white floor; nexus = dark holo grid */
  environment?: "studio" | "nexus";
};

const OPERATOR_ANGLE = 0;
const HTML: CSSProperties = { pointerEvents: "auto", userSelect: "none" };

type PeerSnapshot = {
  slot: OrbitalForwardSlot;
  angle: number;
};

const enteredPeerIds = new Set<string>();

function NexusGridFloor({ darkMode }: { darkMode: boolean }) {
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

function SeatLabel({
  refLabel,
  displayName,
  inCall,
  isHub,
  isSelected,
  hubOpen,
  avatarUrl,
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
  inCall?: boolean;
  isHub: boolean;
  isSelected?: boolean;
  hubOpen?: boolean;
  avatarUrl?: string | null;
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
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className={`min-w-[88px] max-w-[120px] rounded-lg border backdrop-blur-md transition-all ${
        hubOpen
          ? "border-cyan-200 bg-[#021018]/95 shadow-[0_0_28px_rgba(0,229,255,0.45)]"
          : isSelected
            ? "border-cyan-300/70 bg-[#021018]/88"
            : "border-cyan-500/35 bg-[#021018]/80"
      }`}
      style={{ animation: "commsSeatPop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      {!isHub && peerId && seatIndex !== undefined && onHubToggle ? (
        <CommsContactHubPopover
          displayName={displayName}
          refLabel={refLabel}
          avatarUrl={avatarUrl ?? null}
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
        onClick={isHub ? onPhotoClick : onHubToggle}
        className="w-full px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/70"
      >
        <p className="font-mono text-[6px] uppercase tracking-[0.14em] text-cyan-400/75">{refLabel}</p>
        <p className="truncate text-[10px] font-semibold text-white">{displayName}</p>
        <p className="mt-0.5 font-mono text-[6px] uppercase tracking-wider text-emerald-400/85">
          {inCall ? "In call" : isHub ? "You · host" : "Online · tap actions"}
        </p>
      </button>

      {isHub ? (
        <div className="flex justify-center gap-1 border-t border-cyan-500/20 px-1 py-1">
          <button
            type="button"
            className="rounded border border-cyan-500/40 px-1.5 py-0.5 text-[6px] text-cyan-100 hover:bg-cyan-500/15"
            onClick={onHubActivate}
          >
            Chat
          </button>
          <button
            type="button"
            className="rounded border border-violet-500/35 px-1.5 py-0.5 text-[6px] text-violet-100 hover:bg-violet-500/15"
            onClick={onPhotoClick}
          >
            Photo
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OperatorSeat({
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
  const { x, z } = seatXZ(OPERATOR_ANGLE);

  return (
    <group position={[x, 0, z]} rotation={[0, OPERATOR_ANGLE + Math.PI, 0]}>
      <OfficeChair selected />
      <ConferenceLaptop active />
      <StylizedAvatarFigure isOperator selected />
      <Billboard follow position={[0, 1.35, 0]}>
        <Html center distanceFactor={9} style={HTML} zIndexRange={[120, 0]}>
          <SeatLabel
            refLabel={ORBITAL_HUB_LABEL}
            displayName={displayName}
            isHub
            photoUploading={photoUploading}
            avatarUrl={mainUserPhotoUrl}
            onPhotoClick={onPhotoClick}
            onHubActivate={onHubActivate}
            onPeerCall={onPeerCall}
            onPeerMessage={onPeerMessage}
            onPeerGroupCall={onPeerGroupCall}
          />
        </Html>
      </Billboard>
    </group>
  );
}

function AnimatedPeerSeat({
  snapshot,
  mode,
  onLeaveComplete,
  selectedPeerId,
  openHubPeerId,
  onHubToggle,
  onPeerCall,
  onPeerMessage,
  onPeerGroupCall,
}: {
  snapshot: PeerSnapshot;
  mode: "enter" | "seated" | "leave";
  onLeaveComplete?: () => void;
  selectedPeerId?: string | null;
  openHubPeerId?: string | null;
  onHubToggle?: (peerId: string) => void;
  onPeerCall: Props["onPeerCall"];
  onPeerMessage?: Props["onPeerMessage"];
  onPeerGroupCall?: Props["onPeerGroupCall"];
}) {
  const lockedMode = useRef(mode);
  const peer = snapshot.slot.peer!;
  const selected = peer.id === selectedPeerId;
  const hubOpen = peer.id === openHubPeerId;
  const showLabel = lockedMode.current !== "leave";

  return (
    <AnimatedSeatBody
      angle={snapshot.angle}
      mode={lockedMode.current}
      onLeaveComplete={onLeaveComplete}
      inCall={peer.inCall}
      selected={selected}
    >
      {showLabel ? (
        <Billboard follow position={[0, 1.35, 0]}>
          <Html center distanceFactor={9} style={HTML} zIndexRange={[120, 0]}>
            <SeatLabel
              refLabel={snapshot.slot.refLabel}
              displayName={peer.displayName}
              inCall={peer.inCall}
              isHub={false}
              isSelected={selected}
              hubOpen={hubOpen}
              avatarUrl={peer.avatarUrl}
              onPeerCall={onPeerCall}
              onPeerMessage={onPeerMessage}
              onPeerGroupCall={onPeerGroupCall}
              onHubToggle={onHubToggle ? () => onHubToggle(peer.id) : undefined}
              peerId={peer.id}
              seatIndex={snapshot.slot.seatIndex}
            />
          </Html>
        </Billboard>
      ) : null}
    </AnimatedSeatBody>
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
    environment = "studio",
    onPhotoClick,
    onPeerCall,
    onPeerMessage,
    onPeerGroupCall,
    onHubActivate,
  } = props;

  const onlinePeers = forwardSlots.filter((s) => s.peer?.isOnline);
  const knownRef = useRef<Map<string, PeerSnapshot>>(new Map());
  const [departing, setDeparting] = useState<Map<string, PeerSnapshot>>(() => new Map());

  useEffect(() => {
    const nextKnown = new Map<string, PeerSnapshot>();
    onlinePeers.forEach((slot) => {
      nextKnown.set(slot.peer!.id, {
        slot,
        angle: seatIndexToAngle(slot.seatIndex),
      });
    });

    setDeparting((prev) => {
      const next = new Map(prev);
      for (const id of nextKnown.keys()) {
        next.delete(id);
      }
      for (const [id, snap] of knownRef.current) {
        if (!nextKnown.has(id)) next.set(id, snap);
      }
      return next;
    });

    knownRef.current = nextKnown;
  }, [onlinePeers]);

  const toggleHub = (peerId: string) => {
    if (!onHubPeerChange) return;
    onHubPeerChange(openHubPeerId === peerId ? null : peerId);
  };

  const clearDeparting = (peerId: string) => {
    enteredPeerIds.delete(peerId);
    setDeparting((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  };

  const resolveEnterMode = (peerId: string): "enter" | "seated" => {
    if (enteredPeerIds.has(peerId)) return "seated";
    enteredPeerIds.add(peerId);
    return "enter";
  };

  const tableCount = onlinePeers.length + departing.size;

  return (
    <group rotation={environment === "studio" ? [-0.08, 0, 0] : [-0.12, 0, 0]}>
      <StudioEnvironment variant={environment} />
      {environment === "nexus" ? <NexusGridFloor darkMode={darkMode} /> : null}

      <SceneLighting environment={environment} />
      <RoundTable peerCount={tableCount} />

      <ContactShadows
        position={[0, 0, 0]}
        opacity={environment === "studio" ? 0.35 : 0.22}
        scale={12}
        blur={2.4}
        far={6}
      />

      <Billboard follow position={[0, 2.8, 0]}>
        <Html center distanceFactor={11} style={{ pointerEvents: "none" }} zIndexRange={[90, 0]}>
          <div className="whitespace-nowrap rounded-full border border-cyan-500/35 bg-[#021018]/88 px-3 py-1 text-center shadow-[0_0_20px_rgba(0,229,255,0.25)] backdrop-blur-sm">
            <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-cyan-300/85 sm:text-[8px]">
              {onlinePeers.length === 0 && departing.size === 0
                ? "Round table · you are online · waiting for peers"
                : `${onlinePeers.length + 1} seated · peers walk in when online · stand & leave when offline`}
            </p>
          </div>
        </Html>
      </Billboard>

      <OperatorSeat
        mainUserPhotoUrl={mainUserPhotoUrl}
        displayName={displayName}
        photoUploading={photoUploading}
        selectedPeerId={selectedPeerId}
        openHubPeerId={openHubPeerId}
        onHubToggle={toggleHub}
        onPhotoClick={onPhotoClick}
        onPeerCall={onPeerCall}
        onPeerMessage={onPeerMessage}
        onPeerGroupCall={onPeerGroupCall}
        onHubActivate={onHubActivate}
      />

      {onlinePeers.map((slot) => (
        <AnimatedPeerSeat
          key={slot.peer!.id}
          snapshot={{ slot, angle: seatIndexToAngle(slot.seatIndex) }}
          mode={resolveEnterMode(slot.peer!.id)}
            selectedPeerId={selectedPeerId}
            openHubPeerId={openHubPeerId}
            onHubToggle={toggleHub}
            onPeerCall={onPeerCall}
            onPeerMessage={onPeerMessage}
          onPeerGroupCall={onPeerGroupCall}
        />
      ))}

      {[...departing.entries()].map(([peerId, snap]) => (
        <AnimatedPeerSeat
          key={`leave-${peerId}`}
          snapshot={snap}
          mode="leave"
          onLeaveComplete={() => clearDeparting(peerId)}
          selectedPeerId={selectedPeerId}
          openHubPeerId={openHubPeerId}
          onHubToggle={toggleHub}
          onPeerCall={onPeerCall}
          onPeerMessage={onPeerMessage}
          onPeerGroupCall={onPeerGroupCall}
        />
      ))}
    </group>
  );
}

function SceneLighting({ environment }: { environment: "studio" | "nexus" }) {
  if (environment === "studio") {
    return (
      <>
        <ambientLight intensity={0.65} color="#ffffff" />
        <directionalLight
          castShadow
          position={[4, 9, 6]}
          intensity={1.1}
          color="#ffffff"
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-3, 5, -2]} intensity={0.35} color="#dbeafe" />
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={0.22} color="#cfe" />
      <directionalLight position={[3, 10, 5]} intensity={0.55} color="#fff" />
      <directionalLight position={[-4, 6, -2]} intensity={0.18} color="#0ea5e9" />
    </>
  );
}

function CameraRig({ environment }: { environment: "studio" | "nexus" }) {
  const { camera } = useThree();
  camera.position.set(0, environment === "studio" ? 4.8 : 3.6, environment === "studio" ? 5.8 : 5.6);
  camera.lookAt(0, 0.42, 0);
  return null;
}

export function CommsOrbitalScene3D(props: Props) {
  const environment = props.environment ?? "studio";
  const dpr =
    typeof window !== "undefined" ? Math.min(3, Math.max(1.5, window.devicePixelRatio || 1.5)) : 2;

  return (
    <>
      <style>{COMMS_NEXUS_KEYFRAMES}</style>
      <Canvas
        dpr={[1, dpr]}
        shadows
        gl={{
          antialias: true,
          alpha: environment === "nexus",
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: environment === "studio" ? 1.05 : 1,
        }}
        camera={{ fov: environment === "studio" ? 38 : 42, near: 0.08, far: 120 }}
        style={{ width: "100%", height: "100%", display: "block" }}
        onCreated={({ gl, scene }) => {
          if (environment === "nexus") {
            gl.setClearColor(0x000000, 0);
            scene.background = null;
          }
        }}
      >
        <Suspense fallback={null}>
          <CameraRig environment={environment} />
          <SceneInner {...props} environment={environment} />
        </Suspense>
      </Canvas>
    </>
  );
}
