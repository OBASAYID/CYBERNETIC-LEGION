/**
 * High-fidelity 3D orbital layout (reference: heliocentric diagram):
 * emissive central sun, elliptic path, axially tilted lit spheres, star field.
 * `orbitPhaseRef.current` is synced in degrees with the parent (same as 2D orbitDeg).
 */

import { Suspense, useMemo, useRef } from "react";
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
  /** Radians = (orbitPhaseRef.current * Math.PI) / 180 */
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

const AXIAL_TILT = (23.4 * Math.PI) / 180;
const ORBIT_A = 2.38;
const ORBIT_B = 1.58;
const PLANET_R = 0.17;
const SUN_R = 0.42;

function SunTextured({ url }: { url: string }) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return (
    <mesh>
      <sphereGeometry args={[SUN_R, 72, 72]} />
      <meshStandardMaterial map={tex} emissive="#332208" emissiveIntensity={0.35} roughness={0.5} metalness={0.05} />
    </mesh>
  );
}

function SunProcedural() {
  return (
    <mesh>
      <sphereGeometry args={[SUN_R, 72, 72]} />
      <meshStandardMaterial
        color="#fff6e0"
        emissive="#ffcc66"
        emissiveIntensity={1.35}
        roughness={0.38}
        metalness={0.08}
      />
    </mesh>
  );
}

function PlanetTextured({ url }: { url: string }) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return (
    <mesh>
      <sphereGeometry args={[PLANET_R, 64, 64]} />
      <meshStandardMaterial map={tex} roughness={0.62} metalness={0.06} />
    </mesh>
  );
}

function PlanetProcedural({ ocean, land }: { ocean: string; land: string }) {
  return (
    <mesh>
      <sphereGeometry args={[PLANET_R, 64, 64]} />
      <meshStandardMaterial color={ocean} roughness={0.58} metalness={0.18} emissive={land} emissiveIntensity={0.12} />
    </mesh>
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

  useFrame(() => {
    const deg = orbitPhaseRef.current;
    const phi = (deg * Math.PI) / 180 + index * ((Math.PI * 2) / 5);
    const x = ORBIT_A * Math.cos(phi);
    const z = ORBIT_B * Math.sin(phi);
    if (root.current) root.current.position.set(x, 0, z);
  });

  const ocean = darkMode ? "#1e5a7a" : "#2a7ab0";
  const land = darkMode ? "#0d2838" : "#1a4d30";

  return (
    <group ref={root}>
      <group rotation={[AXIAL_TILT, 0, 0]}>
        <Suspense
          fallback={
            <mesh>
              <sphereGeometry args={[PLANET_R, 48, 48]} />
              <meshStandardMaterial color={ocean} roughness={0.6} metalness={0.15} />
            </mesh>
          }
        >
          {peer?.avatarUrl ? (
            <PlanetTextured url={peer.avatarUrl} />
          ) : peer ? (
            <PlanetProcedural ocean={ocean} land={land} />
          ) : (
            <mesh>
              <sphereGeometry args={[PLANET_R, 48, 48]} />
              <meshStandardMaterial color="#0f1f2e" roughness={0.85} metalness={0.05} wireframe={false} />
            </mesh>
          )}
        </Suspense>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[PLANET_R * 1.03, 0.006, 8, 64]} />
          <meshBasicMaterial color="#c44" transparent opacity={0.75} depthWrite={false} />
        </mesh>
      </group>

      <Billboard follow position={[0, -0.38, 0]}>
        <Html
          center
          distanceFactor={5.2}
          style={{ pointerEvents: "auto", userSelect: "none" }}
          zIndexRange={[100, 0]}
        >
          <div
            className={`min-w-[3.2rem] rounded border px-1 py-0.5 text-center shadow-lg backdrop-blur-md ${
              darkMode ? "border-cyan-500/40 bg-black/55 text-cyan-100" : "border-sky-400/50 bg-white/85 text-slate-900"
            }`}
          >
            <p className="font-mono text-[8px] font-bold uppercase tracking-wide">{refLabel}</p>
            {peer ? (
              <>
                <p className="max-w-[4.5rem] truncate text-[6px] uppercase opacity-80">{peer.displayName}</p>
                <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  <button
                    type="button"
                    title="Voice"
                    disabled={peer.inCall}
                    className="rounded border border-emerald-500/50 bg-emerald-950/80 px-1 py-0.5 text-[8px] text-emerald-100 disabled:opacity-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPeerCall(peer.id, peer.displayName, "audio");
                    }}
                  >
                    ♪
                  </button>
                  <button
                    type="button"
                    title="Video"
                    disabled={peer.inCall}
                    className="rounded border border-sky-500/50 bg-sky-950/80 px-1 py-0.5 text-[8px] text-sky-100 disabled:opacity-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPeerCall(peer.id, peer.displayName, "video");
                    }}
                  >
                    ▶
                  </button>
                  {onPeerMessage ? (
                    <button
                      type="button"
                      title="Message"
                      className="rounded border border-violet-500/50 bg-violet-950/70 px-1 py-0.5 text-[8px] text-violet-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPeerMessage(peer.id, peer.displayName);
                      }}
                    >
                      ✉
                    </button>
                  ) : null}
                  {onPeerVideoInvite ? (
                    <button
                      type="button"
                      title="Invite"
                      className="rounded border border-amber-500/45 bg-amber-950/60 px-1 py-0.5 text-[8px] text-amber-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPeerVideoInvite(peer.id, peer.displayName);
                      }}
                    >
                      ✦
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </Html>
      </Billboard>
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
      <fog attach="fog" args={[fogColor, 8, 38]} />

      <Stars radius={120} depth={70} count={7000} factor={2.8} saturation={0.12} fade speed={0.4} />

      <ambientLight intensity={darkMode ? 0.09 : 0.18} color="#8cf" />
      <directionalLight position={[4, 6, 3]} intensity={0.35} color="#dff" />

      <pointLight position={[0, 0, 0]} intensity={5} color="#fff6e6" distance={22} decay={2} />

      <Suspense fallback={<SunProcedural />}>
        {mainUserPhotoUrl ? <SunTextured url={mainUserPhotoUrl} /> : <SunProcedural />}
      </Suspense>

      <Line points={ellipsePoints} color={darkMode ? "#6ee7ff" : "#0ea5e9"} lineWidth={1.2} opacity={0.55} transparent dashed={false} />

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

      <Billboard follow position={[0, -0.72, 0]}>
        <Html center distanceFactor={4.8} style={{ pointerEvents: "auto" }} zIndexRange={[200, 0]}>
          <button
            type="button"
            disabled={photoUploading}
            onClick={onPhotoClick}
            className={`rounded-full border-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] shadow-[0_0_24px_rgba(0,229,255,0.35)] backdrop-blur-md transition hover:brightness-110 disabled:opacity-50 ${
              darkMode
                ? "border-cyan-400/60 bg-black/50 text-cyan-100"
                : "border-sky-500/60 bg-white/90 text-sky-900"
            }`}
          >
            {photoUploading ? "…" : "Set photo"}
          </button>
          <p className={`mt-1 text-center font-mono text-[8px] uppercase tracking-widest ${darkMode ? "text-cyan-200/80" : "text-sky-800/90"}`}>
            {displayName}
          </p>
        </Html>
      </Billboard>
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
      camera={{ position: [0, 1.95, 6.45], fov: 40, near: 0.08, far: 160 }}
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
