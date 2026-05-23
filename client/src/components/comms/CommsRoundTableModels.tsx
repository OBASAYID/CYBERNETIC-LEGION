/**
 * Procedural round-table 3D assets — reference-aligned stylized figures, chairs, laptops.
 * Resolution-independent meshes; animated chart screens reflect live presence state.
 */

import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const AVATAR_BLUE = "#7eb8d8";
const AVATAR_BLUE_DARK = "#5a94b8";
const TABLE_WOOD = "#4a3220";
const TABLE_WOOD_LIGHT = "#6b4a32";
const CHAIR_BLACK = "#141820";

export const TABLE_RADIUS = 1.08;
export const SEAT_RADIUS = 2.42;
export const TABLE_Y = 0.36;

export function seatXZ(angle: number): { x: number; z: number } {
  return { x: Math.sin(angle) * SEAT_RADIUS, z: Math.cos(angle) * SEAT_RADIUS };
}

/** Evenly distribute peer seats around the table; operator stays at angle 0. */
export function peerSeatAngles(peerCount: number): number[] {
  if (peerCount <= 0) return [];
  const step = (Math.PI * 2) / (peerCount + 1);
  return Array.from({ length: peerCount }, (_, i) => step * (i + 1));
}

/** World position along seat ray — t=0 at seat, t=1 toward room exit. */
export function seatPathPoint(angle: number, t: number): { x: number; z: number } {
  const dist = SEAT_RADIUS + t * 4.2;
  return { x: Math.sin(angle) * dist, z: Math.cos(angle) * dist };
}

function ChartScreen({ inCall, active }: { inCall?: boolean; active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const phaseRef = useRef(0);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    canvasRef.current = canvas;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = tex;
    return tex;
  }, []);

  useFrame((_, delta) => {
    const canvas = canvasRef.current;
    const tex = textureRef.current;
    if (!canvas || !tex) return;
    phaseRef.current += delta * (inCall ? 2.4 : 1.2);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bars = [0.42, 0.68, 0.55, 0.82, 0.61, 0.74];
    const barW = 14;
    const gap = 8;
    const baseX = (canvas.width - bars.length * (barW + gap)) / 2;
    bars.forEach((h, i) => {
      const pulse = 0.85 + Math.sin(phaseRef.current + i * 0.7) * 0.15;
      const height = h * pulse * (canvas.height - 28);
      const x = baseX + i * (barW + gap);
      const y = canvas.height - 12 - height;
      ctx.fillStyle = inCall
        ? `rgba(232,121,249,${active !== false ? 0.92 : 0.5})`
        : `rgba(56,189,248,${active !== false ? 0.9 : 0.45})`;
      ctx.fillRect(x, y, barW, height);
    });

    ctx.fillStyle = active !== false ? "#34d399" : "#64748b";
    ctx.font = "bold 11px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      active !== false ? (inCall ? "IN CALL" : "ONLINE") : "IDLE",
      canvas.width / 2,
      14,
    );

    tex.needsUpdate = true;
  });

  return (
    <mesh position={[0, 0.28, -0.22]} rotation={[-0.65, 0, 0]}>
      <planeGeometry args={[0.4, 0.28]} />
      <meshStandardMaterial
        map={texture}
        emissive={inCall ? "#c026d3" : "#0284c7"}
        emissiveIntensity={0.35}
        metalness={0.2}
        roughness={0.45}
      />
    </mesh>
  );
}

export function ConferenceLaptop({
  inCall,
  active,
}: {
  inCall?: boolean;
  active?: boolean;
}) {
  return (
    <group position={[0, TABLE_Y + 0.02, -0.52]} rotation={[-0.42, 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.025, 0.36]} />
        <meshStandardMaterial color="#0c1220" metalness={0.55} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.18, -0.1]} rotation={[-0.65, 0, 0]} castShadow>
        <boxGeometry args={[0.48, 0.012, 0.32]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.4} />
      </mesh>
      <ChartScreen inCall={inCall} active={active} />
    </group>
  );
}

export function RoundTable({ peerCount }: { peerCount: number }) {
  return (
    <group position={[0, TABLE_Y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[TABLE_RADIUS, 96]} />
        <meshStandardMaterial
          color={TABLE_WOOD}
          metalness={0.18}
          roughness={0.32}
          emissive="#1a0f08"
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[TABLE_RADIUS * 0.94, TABLE_RADIUS, 96]} />
        <meshStandardMaterial color={TABLE_WOOD_LIGHT} roughness={0.28} metalness={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[TABLE_RADIUS * 1.01, TABLE_RADIUS * 1.04, 96]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <pointLight color="#00e5ff" intensity={0.8 + peerCount * 0.15} distance={5} position={[0, 0.6, 0]} />
    </group>
  );
}

export function OfficeChair({ selected }: { selected?: boolean }) {
  return (
    <group position={[0, 0, 0.38]}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.09, 0.48]} />
        <meshStandardMaterial color={CHAIR_BLACK} metalness={0.55} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.42, -0.14]} castShadow>
        <boxGeometry args={[0.46, 0.48, 0.07]} />
        <meshStandardMaterial
          color={selected ? "#1e293b" : CHAIR_BLACK}
          emissive={selected ? "#0ea5e9" : "#000000"}
          emissiveIntensity={selected ? 0.25 : 0}
          metalness={0.4}
          roughness={0.52}
        />
      </mesh>
      {[0, 72, 144, 216, 288].map((deg) => (
        <mesh
          key={deg}
          position={[
            Math.sin((deg * Math.PI) / 180) * 0.22,
            0.05,
            0.14 + Math.cos((deg * Math.PI) / 180) * 0.22,
          ]}
          rotation={[0.08, (deg * Math.PI) / 180, 0]}
          castShadow
        >
          <boxGeometry args={[0.04, 0.04, 0.2]} />
          <meshStandardMaterial color="#0f141c" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0.14]}>
        <cylinderGeometry args={[0.04, 0.05, 0.12, 12]} />
        <meshStandardMaterial color="#1f2937" metalness={0.65} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Reference-style humanoid — seatedAmount 0=standing, 1=seated; walkCycle drives arm swing. */
export function StylizedAvatarFigure({
  isOperator,
  inCall,
  selected,
  seatedAmount = 1,
  walkCycle = 0,
  animStateRef,
}: {
  isOperator?: boolean;
  inCall?: boolean;
  selected?: boolean;
  seatedAmount?: number;
  walkCycle?: number;
  /** When set, pose reads live animation state each frame. */
  animStateRef?: RefObject<{ seatedAmount: number; walkCycle: number; opacity?: number }>;
}) {
  const bodyColor = isOperator ? "#8ecae6" : AVATAR_BLUE;
  const bodyDark = isOperator ? "#6ba8c8" : AVATAR_BLUE_DARK;
  const emissive = inCall ? "#d946ef" : selected ? "#0ea5e9" : "#000000";
  const emissiveIntensity = inCall ? 0.35 : selected ? 0.2 : 0;

  const headRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const seated = animStateRef?.current?.seatedAmount ?? seatedAmount;
    const walk = animStateRef?.current?.walkCycle ?? walkCycle;
    const swing = Math.sin(walk) * 0.22 * (1 - seated);

    if (headRef.current) {
      headRef.current.position.y = THREE.MathUtils.lerp(1.12, 0.72, seated);
    }
    if (torsoRef.current) {
      torsoRef.current.position.y = THREE.MathUtils.lerp(0.82, 0.38, seated);
      torsoRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.12, seated);
    }
    if (armLRef.current) {
      armLRef.current.position.set(
        THREE.MathUtils.lerp(-0.14, -0.28, seated),
        THREE.MathUtils.lerp(0.78, 0.48, seated),
        THREE.MathUtils.lerp(0.02, -0.18, seated),
      );
      armLRef.current.rotation.set(
        THREE.MathUtils.lerp(0.15, 0.6, seated) + swing,
        THREE.MathUtils.lerp(0, 0.15, seated),
        THREE.MathUtils.lerp(0.1, 0.35, seated),
      );
    }
    if (armRRef.current) {
      armRRef.current.position.set(
        THREE.MathUtils.lerp(0.14, 0.28, seated),
        THREE.MathUtils.lerp(0.78, 0.48, seated),
        THREE.MathUtils.lerp(0.02, -0.18, seated),
      );
      armRRef.current.rotation.set(
        THREE.MathUtils.lerp(0.15, 0.6, seated) - swing,
        THREE.MathUtils.lerp(0, -0.15, seated),
        THREE.MathUtils.lerp(-0.1, -0.35, seated),
      );
    }
    if (legLRef.current) {
      legLRef.current.visible = seated < 0.92;
      legLRef.current.position.set(-0.1, 0.28, 0.06);
      legLRef.current.rotation.x = swing * 0.55 * (1 - seated);
    }
    if (legRRef.current) {
      legRRef.current.visible = seated < 0.92;
      legRRef.current.position.set(0.1, 0.28, 0.06);
      legRRef.current.rotation.x = -swing * 0.55 * (1 - seated);
    }
    if (ringRef.current) {
      ringRef.current.position.y = seated > 0.5 ? 0.02 : 0.04;
    }
  });

  return (
    <group position={[0, 0.02, -0.08]}>
      <mesh ref={headRef} position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.5}
          metalness={0.08}
          roughness={0.38}
        />
      </mesh>
      <mesh ref={torsoRef} position={[0, 0.38, 0.02]} castShadow>
        <capsuleGeometry args={[0.2, 0.38, 8, 24]} />
        <meshStandardMaterial
          color={bodyDark}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.35}
          metalness={0.06}
          roughness={0.42}
        />
      </mesh>
      <mesh ref={armLRef} castShadow>
        <capsuleGeometry args={[0.05, 0.28, 6, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh ref={armRRef} castShadow>
        <capsuleGeometry args={[0.05, 0.28, 6, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh ref={legLRef} visible={false} castShadow>
        <capsuleGeometry args={[0.06, 0.34, 6, 12]} />
        <meshStandardMaterial color={bodyDark} roughness={0.42} metalness={0.05} />
      </mesh>
      <mesh ref={legRRef} visible={false} castShadow>
        <capsuleGeometry args={[0.06, 0.34, 6, 12]} />
        <meshStandardMaterial color={bodyDark} roughness={0.42} metalness={0.05} />
      </mesh>
      {inCall ? (
        <mesh position={[0, 0.95, 0]}>
          <ringGeometry args={[0.22, 0.26, 32]} />
          <meshBasicMaterial color="#e879f9" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ) : (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.35, 0.38, 32]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** @deprecated Use AnimatedSeatBody enter/leave flow instead. */
export function PopInGroup({ visible, children }: { visible: boolean; children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);

  useFrame((_, delta) => {
    const target = visible ? 1 : 0;
    scaleRef.current = THREE.MathUtils.lerp(
      scaleRef.current,
      target,
      Math.min(1, delta * (visible ? 5.5 : 8)),
    );
    const g = groupRef.current;
    if (g) {
      const s = scaleRef.current;
      g.scale.set(s, s, s);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export function StudioEnvironment({ variant }: { variant: "studio" | "nexus" }) {
  if (variant === "nexus") return null;

  return (
    <>
      <color attach="background" args={["#f4f6f8"]} />
      <fog attach="fog" args={["#f4f6f8", 14, 28]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#e8ecf0" roughness={0.92} metalness={0.02} />
      </mesh>
    </>
  );
}
