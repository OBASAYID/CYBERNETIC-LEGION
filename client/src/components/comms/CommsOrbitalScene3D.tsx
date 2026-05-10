/**
 * High-fidelity 3D orbital layout: emissive hub, elliptic path, hub→node tethers,
 * large matte user spheres with cyan rim glow (reference: command-center aesthetic).
 * `orbitPhaseRef.current` is orbit angle in degrees (synced with parent drag/wheel).
 */

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Html, Line, Stars, useTexture } from "@react-three/drei";
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
const AXIAL_TILT = (23.4 * Math.PI) / 180;
/** Overall scene scale (−10% vs prior art). */
const S = 0.9;
const ORBIT_A = 2.62 * S;
const ORBIT_B = 1.72 * S;
/** Base radius for user presence spheres. */
const PLANET_R = 0.34 * S;
const SUN_R = 0.42 * S;
/** Front cap offset so Html sits flush on sphere (not floating). */
const HUB_FACE_Z = SUN_R * 1.002;
const NODE_FACE_Z = PLANET_R * 1.003;

function orbitXZ(index: number, deg: number) {
  const phi = (deg * Math.PI) / 180 + index * ((Math.PI * 2) / 5);
  return { x: ORBIT_A * Math.cos(phi), z: ORBIT_B * Math.sin(phi) };
}

/** Photo mapped onto the center hub sphere (main / operator user). */
function SunTextured({ url }: { url: string }) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return (
    <mesh>
      <sphereGeometry args={[SUN_R, 72, 72]} />
      <meshStandardMaterial map={tex} emissive="#1a2838" emissiveIntensity={0.22} roughness={0.48} metalness={0.06} />
    </mesh>
  );
}

/** Shared cyan accent: command-center rim + wireframe (center hub only). */
function HubRimAccents() {
  return (
    <group>
      <mesh scale={1.06}>
        <sphereGeometry args={[SUN_R, 48, 48]} />
        <meshBasicMaterial
          color={CYAN}
          side={THREE.BackSide}
          transparent
          opacity={0.26}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[SUN_R * 1.04, 0.012, 12, 96]} />
        <meshStandardMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={2}
          roughness={0.35}
          metalness={0.38}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[SUN_R * 1.018, 36, 18]} />
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.11} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Empty hub: dark core prompting main-user photo upload (not a generic “sun”). */
function HubAwaitingMainPhoto({ darkMode }: { darkMode: boolean }) {
  const base = darkMode ? "#050c14" : "#0a1520";
  return (
    <group>
      <mesh>
        <sphereGeometry args={[SUN_R, 64, 64]} />
        <meshStandardMaterial
          color={base}
          roughness={0.9}
          metalness={0.07}
          emissive="#021018"
          emissiveIntensity={0.4}
        />
      </mesh>
      <HubRimAccents />
    </group>
  );
}

/**
 * Center sphere = main user (operator). Texture fills the mesh when `mainUserPhotoUrl` is set;
 * upload is triggered from the face-on control (Html) so orbit drag on the parent still works.
 */
function MainUserHub({
  mainUserPhotoUrl,
  displayName,
  photoUploading,
  darkMode,
  onPhotoClick,
}: {
  mainUserPhotoUrl: string | null;
  displayName: string;
  photoUploading: boolean;
  darkMode: boolean;
  onPhotoClick: () => void;
}) {
  const initial = (displayName.trim().charAt(0) || "?").toUpperCase();
  const hasPhoto = !!mainUserPhotoUrl;
  /** Photo ring sits on sphere cap; with texture, only captions sit below the limb. */
  const hubLabelPos: [number, number, number] = hasPhoto ? [0, -SUN_R * 0.58, SUN_R * 0.9] : [0, 0, HUB_FACE_Z];

  return (
    <group>
      <Suspense fallback={<HubAwaitingMainPhoto darkMode={darkMode} />}>
        {hasPhoto ? (
          <group>
            <SunTextured url={mainUserPhotoUrl!} />
            <HubRimAccents />
          </group>
        ) : (
          <HubAwaitingMainPhoto darkMode={darkMode} />
        )}
      </Suspense>

      <Billboard follow position={hubLabelPos}>
        <Html
          center
          distanceFactor={hasPhoto ? 5.1 : 5.45}
          style={{ pointerEvents: "auto", userSelect: "none" }}
          zIndexRange={[250, 0]}
        >
          <div className="flex flex-col items-center">
            <button
              type="button"
              disabled={photoUploading}
              onClick={onPhotoClick}
              title={hasPhoto ? "Change your profile photo" : "Upload your profile photo"}
              className="flex flex-col items-center rounded-lg border-0 bg-transparent p-0 transition hover:brightness-110 disabled:opacity-50"
            >
              {!hasPhoto ? (
                <div
                  className="relative rounded-full p-[2px] shadow-[0_0_28px_rgba(0,229,255,0.45)]"
                  style={{ background: `linear-gradient(145deg, ${CYAN}dd, rgba(0,229,255,0.2))` }}
                >
                  <div className="flex h-[4.65rem] w-[4.65rem] items-center justify-center rounded-full bg-[#030810] sm:h-[5.35rem] sm:w-[5.35rem]">
                    <span className="text-3xl font-bold text-cyan-100 sm:text-4xl">{initial}</span>
                  </div>
                </div>
              ) : null}

              <p
                className={`mt-2 text-center text-sm font-semibold sm:text-base ${
                  darkMode ? "text-white drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]" : "text-slate-900"
                }`}
              >
                {displayName}
              </p>
              <p className="mt-1 rounded-md border border-cyan-500/40 bg-black/45 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-cyan-100 backdrop-blur-sm">
                {photoUploading ? "Uploading…" : hasPhoto ? "Tap to change photo" : "Tap to add photo"}
              </p>
            </button>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

/** Glowing link from hub to each orbit node. */
function HubTether({ orbitPhaseRef, index }: { orbitPhaseRef: React.MutableRefObject<number>; index: number }) {
  const lineObj = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(6);
    const attr = new THREE.BufferAttribute(arr, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", attr);
    const mat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.38 });
    return new THREE.Line(g, mat);
  }, []);

  useFrame(() => {
    const { x, z } = orbitXZ(index, orbitPhaseRef.current);
    const geo = lineObj.geometry;
    const arr = geo.attributes.position.array as Float32Array;
    arr[0] = 0;
    arr[1] = 0;
    arr[2] = 0;
    arr[3] = -x;
    arr[4] = 0;
    arr[5] = -z;
    geo.attributes.position.needsUpdate = true;
  });

  return <primitive object={lineObj} />;
}

function UserSphereBody({ darkMode, online }: { darkMode: boolean; online: boolean }) {
  const base = darkMode ? "#050a10" : "#0c1520";
  return (
    <group>
      <mesh>
        <sphereGeometry args={[PLANET_R, 64, 64]} />
        <meshStandardMaterial
          color={base}
          roughness={0.93}
          metalness={0.06}
          emissive={online ? "#001820" : "#000000"}
          emissiveIntensity={online ? 0.35 : 0.08}
        />
      </mesh>
      {/* Cyan rim glow — backface shell */}
      <mesh scale={1.085}>
        <sphereGeometry args={[PLANET_R, 48, 48]} />
        <meshBasicMaterial
          color={CYAN}
          side={THREE.BackSide}
          transparent
          opacity={online ? 0.32 : 0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Sharp equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PLANET_R * 1.02, 0.009, 12, 96]} />
        <meshStandardMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={online ? 2.2 : 0.6}
          roughness={0.35}
          metalness={0.4}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

function OrbitingNode({
  index,
  orbitPhaseRef,
  refLabel,
  peer,
  darkMode,
  onPeerCall,
  onPeerMessage,
  onPeerVideoInvite,
}: {
  index: number;
  orbitPhaseRef: React.MutableRefObject<number>;
  refLabel: string;
  peer: ScenePeer | null;
  darkMode: boolean;
} & Pick<Props, "onPeerCall" | "onPeerMessage" | "onPeerVideoInvite">) {
  const root = useRef<THREE.Group>(null);
  const blob = useRef<THREE.Group>(null);
  const scaleCurrent = useRef(0.25);

  const online = !!peer;

  useEffect(() => {
    if (online) scaleCurrent.current = Math.min(scaleCurrent.current, 0.2);
  }, [online, peer?.id]);

  useFrame((_, dt) => {
    const { x, z } = orbitXZ(index, orbitPhaseRef.current);
    if (root.current) root.current.position.set(x, 0, z);

    const target = online ? 1 : 0.38;
    const k = Math.min(12 * dt, 1);
    scaleCurrent.current += (target - scaleCurrent.current) * k;
    if (blob.current) blob.current.scale.setScalar(Math.max(0.08, scaleCurrent.current));
  });

  return (
    <group ref={root}>
      <HubTether orbitPhaseRef={orbitPhaseRef} index={index} />

      <group ref={blob}>
        <group rotation={[AXIAL_TILT, 0, 0]}>
          <Suspense fallback={null}>
            <UserSphereBody darkMode={darkMode} online={online} />
          </Suspense>
          {/* Ring + portrait on sphere cap (same tilt as mesh) */}
          <Billboard follow position={[0, 0, NODE_FACE_Z]}>
            <Html
              center
              distanceFactor={5.35}
              style={{ pointerEvents: "auto", userSelect: "none" }}
              zIndexRange={[100, 0]}
            >
            <div className="flex flex-col items-center">
              <div
                className={`relative rounded-full p-[2px] shadow-[0_0_24px_rgba(0,229,255,0.5),0_0_2px_rgba(0,229,255,0.85)] ${
                  online ? "opacity-100" : "opacity-45"
                }`}
                style={{
                  background: `linear-gradient(145deg, ${CYAN}cc, rgba(0,229,255,0.15))`,
                }}
              >
                <div
                  className={`flex items-center justify-center overflow-hidden rounded-full bg-[#030810] ${
                    online ? "h-[4.1rem] w-[4.1rem] sm:h-[4.7rem] sm:w-[4.7rem]" : "h-[2.75rem] w-[2.75rem] sm:h-[3rem] sm:w-[3rem]"
                  }`}
                >
                  {online && peer.avatarUrl ? (
                    <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : online ? (
                    <span className="text-2xl font-bold text-cyan-100 sm:text-3xl">
                      {peer.displayName.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <span className="font-mono text-sm font-bold text-cyan-500/40">—</span>
                  )}
                </div>
                {online && peer.inCall ? (
                  <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.95)]" />
                ) : online ? (
                  <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                ) : null}
              </div>

              <p className="mt-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-100/90 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
                {refLabel}
              </p>
              {online ? (
                <p
                  className={`mt-0.5 max-w-[7.5rem] text-center text-[10px] font-semibold leading-tight sm:max-w-[9rem] sm:text-[11px] ${
                    darkMode ? "text-white drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]" : "text-slate-900"
                  }`}
                >
                  {peer.displayName}
                </p>
              ) : (
                <p className="mt-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-cyan-400/45">
                  Offline
                </p>
              )}

              {online ? (
                <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                  <button
                    type="button"
                    title="Voice"
                    disabled={peer.inCall}
                    className="rounded-md border border-emerald-500/50 bg-emerald-950/85 px-1.5 py-1 text-[9px] text-emerald-100 disabled:opacity-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPeerCall(peer.id, peer.displayName, "audio");
                    }}
                  >
                    Voice
                  </button>
                  <button
                    type="button"
                    title="Video"
                    disabled={peer.inCall}
                    className="rounded-md border border-sky-500/50 bg-sky-950/85 px-1.5 py-1 text-[9px] text-sky-100 disabled:opacity-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPeerCall(peer.id, peer.displayName, "video");
                    }}
                  >
                    Video
                  </button>
                  {onPeerMessage ? (
                    <button
                      type="button"
                      title="Message"
                      className="rounded-md border border-violet-500/50 bg-violet-950/75 px-1.5 py-1 text-[9px] text-violet-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPeerMessage(peer.id, peer.displayName);
                      }}
                    >
                      Msg
                    </button>
                  ) : null}
                  {onPeerVideoInvite ? (
                    <button
                      type="button"
                      title="Invite"
                      className="rounded-md border border-amber-500/45 bg-amber-950/65 px-1.5 py-1 text-[9px] text-amber-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPeerVideoInvite(peer.id, peer.displayName);
                      }}
                    >
                      Invite
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Html>
          </Billboard>
        </group>
      </group>
    </group>
  );
}

function SceneInner(props: Props) {
  const { orbitPhaseRef, darkMode, forwardSlots, mainUserPhotoUrl, displayName, photoUploading, onPhotoClick, onPeerCall, onPeerMessage, onPeerVideoInvite } =
    props;

  const ellipsePoints = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, ORBIT_A, ORBIT_B, 0, Math.PI * 2, false, 0);
    return curve.getPoints(200).map((p) => new THREE.Vector3(p.x, 0, p.y));
  }, []);

  const fogColor = darkMode ? "#030810" : "#e8f4fc";

  return (
    <group rotation={[-0.14, 0, 0]}>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 8, 42]} />

      <Stars radius={120} depth={70} count={7000} factor={2.8} saturation={0.12} fade speed={0.4} />

      <ambientLight intensity={darkMode ? 0.09 : 0.18} color="#8cf" />
      <directionalLight position={[4, 6, 3]} intensity={0.38} color="#dff" />

      <pointLight position={[0, 0, 0]} intensity={5.5} color="#fff6e6" distance={26} decay={2} />

      <MainUserHub
        mainUserPhotoUrl={mainUserPhotoUrl}
        displayName={displayName}
        photoUploading={photoUploading}
        darkMode={darkMode}
        onPhotoClick={onPhotoClick}
      />

      <Line points={ellipsePoints} color={darkMode ? "#6ee7ff" : "#0ea5e9"} lineWidth={1.2} opacity={0.5} transparent dashed={false} />

      {forwardSlots.map((slot, i) => (
        <OrbitingNode
          key={slot.refLabel}
          index={i}
          orbitPhaseRef={orbitPhaseRef}
          refLabel={slot.refLabel}
          peer={slot.peer}
          darkMode={darkMode}
          onPeerCall={onPeerCall}
          onPeerMessage={onPeerMessage}
          onPeerVideoInvite={onPeerVideoInvite}
        />
      ))}
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
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 2.05, 6.85], fov: 40, near: 0.08, far: 160 }}
      style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }}
      onCreated={({ gl }) => {
        gl.domElement.style.pointerEvents = "none";
      }}
    >
      <Suspense fallback={null}>
        <SceneInner {...props} />
      </Suspense>
    </Canvas>
  );
}
