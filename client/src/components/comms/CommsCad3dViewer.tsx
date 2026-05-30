// @ts-nocheck
import { Suspense, useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { Center, Grid, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import type { CommsCadPreviewFormat } from "../../lib/comms-cad-formats";

interface CommsCad3dViewerProps {
  url: string;
  format: CommsCadPreviewFormat;
  className?: string;
  compact?: boolean;
}

function StlMesh({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  const normalized = useMemo(() => {
    const g = geometry.clone();
    g.computeVertexNormals();
    g.center();
    g.computeBoundingBox();
    const box = g.boundingBox;
    if (box) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      g.scale(1.6 / maxDim, 1.6 / maxDim, 1.6 / maxDim);
    }
    return g;
  }, [geometry]);
  return (
    <mesh geometry={normalized} castShadow receiveShadow>
      <meshStandardMaterial color="#5eead4" metalness={0.45} roughness={0.38} />
    </mesh>
  );
}

function ObjScene({ url }: { url: string }) {
  const object = useLoader(OBJLoader, url);
  const scene = useMemo(() => {
    const clone = object.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#67e8f9",
          metalness: 0.4,
          roughness: 0.42,
        });
      }
    });
    return clone;
  }, [object]);
  return <primitive object={scene} />;
}

function PlyMesh({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color="#a5f3fc"
        metalness={0.35}
        roughness={0.45}
        vertexColors={geometry.hasAttribute("color")}
      />
    </mesh>
  );
}

function GltfScene({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene.clone(true)} />;
}

function ColladaScene({ url }: { url: string }) {
  const collada = useLoader(ColladaLoader, url);
  if (!collada?.scene) return null;
  return <primitive object={collada.scene.clone(true)} />;
}

function ThreeMfScene({ url }: { url: string }) {
  const object = useLoader(ThreeMFLoader, url);
  return <primitive object={object.clone(true)} />;
}

function CadModel({ url, format }: { url: string; format: CommsCadPreviewFormat }) {
  switch (format) {
    case "stl":
      return <StlMesh url={url} />;
    case "obj":
      return <ObjScene url={url} />;
    case "ply":
      return <PlyMesh url={url} />;
    case "glb":
    case "gltf":
      return <GltfScene url={url} />;
    case "dae":
      return <ColladaScene url={url} />;
    case "3mf":
      return <ThreeMfScene url={url} />;
    default:
      return null;
  }
}

function LoadingOverlay({ compact }: { compact?: boolean }) {
  return (
    <Html center>
      <div className={`text-[11px] text-cyan-200/70 ${compact ? "" : ""}`}>Loading 3D model…</div>
    </Html>
  );
}

export function CommsCad3dViewer({ url, format, className = "", compact = false }: CommsCad3dViewerProps) {
  const height = compact ? "h-44" : "h-56 sm:h-64";

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-cyan-400/25 bg-gradient-to-b from-slate-950/90 to-cyan-950/30 ${height} ${className}`}
    >
      <Canvas shadows camera={{ position: [2.2, 1.6, 2.4], fov: 42 }} className="!h-full !w-full">
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={<LoadingOverlay compact={compact} />}>
          <Center>
            <CadModel url={url} format={format} />
          </Center>
        </Suspense>
        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.4}
          sectionSize={2}
          sectionThickness={0.8}
          fadeDistance={12}
          fadeStrength={1}
          infiniteGrid
          position={[0, -0.85, 0]}
        />
        <OrbitControls makeDefault enablePan minDistance={0.8} maxDistance={8} target={[0, 0, 0]} />
      </Canvas>
      <span className="pointer-events-none absolute bottom-1.5 left-2 text-[9px] text-cyan-300/55">
        Drag to orbit · scroll to zoom
      </span>
    </div>
  );
}
