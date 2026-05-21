/**
 * Smart-city reference layout: perspective grid floor, five fixed arc slots
 * (2 back · 2 mid · 1 front), holographic cone + portrait user cards.
 */

import { Suspense, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, Grid, Html } from "@react-three/drei";
import * as THREE from "three";

type ScenePeer = {
  id: string;
  displayName: string;
  inCall?: boolean;
  avatarUrl: string | null;
};

export type ForwardOrbitSlot = { refLabel: string; peer: ScenePeer | null };

type Props = {
  orbitPhaseRef: React.MutableRefObject<number>;
  darkMode: boolean;
  forwardSlots: ForwardOrbitSlot[];
  mainUserPhotoUrl: string | null;
  displayName: string;
  photoUploading: boolean;
  onPhotoClick: () => void;
  onPeerCall: (peerId: string, peerName: string, type: "audio" | "video") => void;
  onPeerMessage?: (peerId: string, peerName: string) => void;
  onPeerVideoInvite?: (peerId: string, peerName: string) => void;
};

const CYAN = "#00e5ff";
const CARD_HTML_DISTANCE = 6.8;

/** Reference arc: shallow V — back pair, mid pair, front center (operator). */
const ARC_LAYOUT = [
  { key: "back-l", peerIndex: 0, x: -2.05, z: -1.72, scale: 0.74 },
  { key: "back-r", peerIndex: 1, x: 2.05, z: -1.72, scale: 0.74 },
  { key: "mid-l", peerIndex: 2, x: -1.08, z: -0.48, scale: 0.88 },
  { key: "mid-r", peerIndex: 3, x: 1.08, z: -0.48, scale: 0.88 },
  { key: "front-c", peerIndex: -1, x: 0, z: 0.92, scale: 1.02 },
] as const;

const HTML_CARD: CSSProperties = {
  pointerEvents: "auto",
  userSelect: "none",
};

function PerspectiveFloor({ darkMode }: { darkMode: boolean }) {
  const cell = darkMode ? "#0ea5e9" : "#0284c7";
  const section = darkMode ? "#22d3ee" : "#0ea5e9";
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <Grid
        infiniteGrid
        cellSize={0.42}
        cellThickness={0.65}
        sectionSize={2.1}
        sectionThickness={1.1}
        fadeDistance={22}
        fadeStrength={1.15}
        cellColor={cell}
        sectionColor={section}
      />
    </group>
  );
}

function PlatformBase({ scale }: { scale: number }) {
  const radii = [0.34, 0.48, 0.62];
  return (
    <group scale={scale}>
      {radii.map((r, i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004 * i, 0]}>
          <ringGeometry args={[r * 0.82, r, 64]} />
          <meshBasicMaterial
            color={CYAN}
            transparent
            opacity={0.55 - i * 0.14}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight color={CYAN} intensity={1.8 * scale} distance={4 * scale} decay={2} position={[0, 0.15, 0]} />
    </group>
  );
}

function HologramCone({ scale }: { scale: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.52, 0]}>
        <coneGeometry args={[0.2, 1.05, 32, 1, true]} />
        <meshBasicMaterial
          color={CYAN}
          transparent
          opacity={0.11}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <coneGeometry args={[0.12, 0.95, 24, 1, true]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function PortraitCard({
  refLabel,
  displayName,
  avatarUrl,
  online,
  inCall,
  isHub,
  photoUploading,
  darkMode,
  onPhotoClick,
  onPeerCall,
  onPeerMessage,
  onPeerVideoInvite,
  peerId,
}: {
  refLabel: string;
  displayName: string;
  avatarUrl: string | null;
  online: boolean;
  inCall?: boolean;
  isHub: boolean;
  photoUploading?: boolean;
  darkMode: boolean;
  onPhotoClick?: () => void;
  onPeerCall?: (peerId: string, peerName: string, type: "audio" | "video") => void;
  onPeerMessage?: (peerId: string, peerName: string) => void;
  onPeerVideoInvite?: (peerId: string, peerName: string) => void;
  peerId?: string;
}) {
  const initial = (displayName.trim().charAt(0) || "?").toUpperCase();
  const showActions = online && !isHub && peerId && onPeerCall;

  return (
    <div
      className={`flex w-[min(112px,22vw)] flex-col overflow-hidden rounded-md border shadow-[0_0_36px_rgba(0,229,255,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] sm:w-[118px] ${
        online || isHub
          ? "border-cyan-400/65 bg-gradient-to-b from-[#062038]/96 via-[#041528]/94 to-[#020a14]/98"
          : "border-cyan-500/25 bg-gradient-to-b from-[#041018]/90 to-[#020810]/95 opacity-70"
      }`}
    >
      <div className="border-b border-cyan-500/45 bg-gradient-to-r from-cyan-950/80 via-cyan-900/50 to-cyan-950/80 px-2 py-1 text-center">
        <span className="font-mono text-[7px] font-bold uppercase tracking-[0.16em] text-cyan-50 sm:text-[8px]">
          {refLabel}
        </span>
      </div>

      <button
        type="button"
        disabled={isHub && photoUploading}
        onClick={isHub ? onPhotoClick : undefined}
        className={`relative aspect-[3/4] w-full overflow-hidden bg-[#030810] ${isHub ? "cursor-pointer transition hover:brightness-110 disabled:opacity-50" : "cursor-default"}`}
        title={isHub ? (avatarUrl ? "Change profile photo" : "Upload profile photo") : displayName}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover object-top" draggable={false} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-[#051525] to-[#020810]">
            <span className="text-3xl font-bold text-cyan-100/90">{initial}</span>
            {isHub ? (
              <span className="px-2 text-center font-mono text-[7px] uppercase tracking-wider text-cyan-300/75">
                {photoUploading ? "Uploading…" : "Tap to add photo"}
              </span>
            ) : null}
          </div>
        )}
        {(online || isHub) && inCall ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9]" />
        ) : online || isHub ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        ) : null}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020810]/90 to-transparent"
          aria-hidden
        />
      </button>

      <div className="border-t border-cyan-500/30 px-2 py-1.5 text-center">
        <p
          className={`truncate text-[10px] font-semibold leading-tight sm:text-[11px] ${
            darkMode ? "text-white" : "text-slate-900"
          }`}
        >
          {displayName}
        </p>
        <p className="mt-0.5 font-mono text-[7px] uppercase tracking-wider text-cyan-300/65">
          {isHub ? "Operator" : online ? (inCall ? "In call" : "Online") : "Offline"}
        </p>
      </div>

      {showActions ? (
        <div className="flex flex-wrap justify-center gap-1 border-t border-cyan-500/25 px-1.5 py-1.5">
          <button
            type="button"
            title="Voice"
            disabled={inCall}
            className="rounded border border-emerald-500/50 bg-emerald-950/85 px-1.5 py-0.5 text-[8px] text-emerald-100 disabled:opacity-40"
            onClick={(e) => {
              e.stopPropagation();
              onPeerCall!(peerId!, displayName, "audio");
            }}
          >
            Voice
          </button>
          <button
            type="button"
            title="Video"
            disabled={inCall}
            className="rounded border border-sky-500/50 bg-sky-950/85 px-1.5 py-0.5 text-[8px] text-sky-100 disabled:opacity-40"
            onClick={(e) => {
              e.stopPropagation();
              onPeerCall!(peerId!, displayName, "video");
            }}
          >
            Video
          </button>
          {onPeerMessage ? (
            <button
              type="button"
              title="Message"
              className="rounded border border-violet-500/50 bg-violet-950/75 px-1.5 py-0.5 text-[8px] text-violet-100"
              onClick={(e) => {
                e.stopPropagation();
                onPeerMessage(peerId!, displayName);
              }}
            >
              Msg
            </button>
          ) : null}
          {onPeerVideoInvite ? (
            <button
              type="button"
              title="Invite"
              className="rounded border border-amber-500/45 bg-amber-950/65 px-1.5 py-0.5 text-[8px] text-amber-100"
              onClick={(e) => {
                e.stopPropagation();
                onPeerVideoInvite(peerId!, displayName);
              }}
            >
              Invite
            </button>
          ) : null}
        </div>
      ) : isHub ? (
        <div className="border-t border-cyan-500/25 px-2 py-1 text-center font-mono text-[7px] uppercase tracking-wider text-cyan-300/60">
          Communications hub
        </div>
      ) : null}
    </div>
  );
}

function ArcModule({
  layout,
  slot,
  isHub,
  mainUserPhotoUrl,
  displayName,
  photoUploading,
  darkMode,
  onPhotoClick,
  onPeerCall,
  onPeerMessage,
  onPeerVideoInvite,
}: {
  layout: (typeof ARC_LAYOUT)[number];
  slot: ForwardOrbitSlot | null;
  isHub: boolean;
  mainUserPhotoUrl: string | null;
  displayName: string;
  photoUploading: boolean;
  darkMode: boolean;
  onPhotoClick: () => void;
  onPeerCall: Props["onPeerCall"];
  onPeerMessage?: Props["onPeerMessage"];
  onPeerVideoInvite?: Props["onPeerVideoInvite"];
}) {
  const peer = slot?.peer ?? null;
  const online = isHub || !!peer;
  const refLabel = isHub ? "Operator" : slot?.refLabel ?? "—";
  const name = isHub ? displayName : peer?.displayName ?? refLabel;
  const avatar = isHub ? mainUserPhotoUrl : peer?.avatarUrl ?? null;

  return (
    <group position={[layout.x, 0, layout.z]} scale={layout.scale}>
      <PlatformBase scale={1} />
      <HologramCone scale={1} />
      <Billboard follow position={[0, 1.08, 0]}>
        <Html center distanceFactor={CARD_HTML_DISTANCE} style={HTML_CARD} zIndexRange={[120, 0]}>
          <PortraitCard
            refLabel={refLabel}
            displayName={name}
            avatarUrl={avatar}
            online={online}
            inCall={peer?.inCall}
            isHub={isHub}
            photoUploading={photoUploading}
            darkMode={darkMode}
            onPhotoClick={onPhotoClick}
            onPeerCall={onPeerCall}
            onPeerMessage={onPeerMessage}
            onPeerVideoInvite={onPeerVideoInvite}
            peerId={peer?.id}
          />
        </Html>
      </Billboard>
    </group>
  );
}

function SceneInner({
  darkMode,
  forwardSlots,
  mainUserPhotoUrl,
  displayName,
  photoUploading,
  onPhotoClick,
  onPeerCall,
  onPeerMessage,
  onPeerVideoInvite,
}: Props) {
  return (
    <group rotation={[-0.22, 0, 0]}>
      <PerspectiveFloor darkMode={darkMode} />

      <ambientLight intensity={darkMode ? 0.12 : 0.2} color="#8cf" />
      <directionalLight position={[2, 8, 4]} intensity={0.45} color="#dff" />
      <directionalLight position={[-3, 4, -2]} intensity={0.18} color="#0ea5e9" />

      {ARC_LAYOUT.map((layout) => {
        const isHub = layout.peerIndex === -1;
        const slot = isHub ? null : forwardSlots[layout.peerIndex] ?? null;
        return (
          <ArcModule
            key={layout.key}
            layout={layout}
            slot={slot}
            isHub={isHub}
            mainUserPhotoUrl={mainUserPhotoUrl}
            displayName={displayName}
            photoUploading={photoUploading}
            darkMode={darkMode}
            onPhotoClick={onPhotoClick}
            onPeerCall={onPeerCall}
            onPeerMessage={onPeerMessage}
            onPeerVideoInvite={onPeerVideoInvite}
          />
        );
      })}
    </group>
  );
}

export function CommsOrbitalScene3D(props: Props) {
  const dpr = typeof window !== "undefined" ? Math.min(2.25, window.devicePixelRatio || 1) : 1.5;

  return (
    <Canvas
      dpr={[1, dpr]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 2.85, 5.35], fov: 42, near: 0.08, far: 120 }}
      style={{ width: "100%", height: "100%", display: "block" }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor(0x000000, 0);
        scene.background = null;
        camera.lookAt(0, 0.15, -0.15);
      }}
    >
      <Suspense fallback={null}>
        <SceneInner {...props} />
      </Suspense>
    </Canvas>
  );
}
