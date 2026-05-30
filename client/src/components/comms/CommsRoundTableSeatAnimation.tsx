/**
 * Round-table seat enter/leave animations — walk in & sit down; stand up & leave room.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  ConferenceLaptop,
  OfficeChair,
  SEAT_RADIUS,
  StylizedAvatarFigure,
  seatPathPoint,
} from "./CommsRoundTableModels";

export type SeatAnimPhase = "enter-walk" | "enter-sit" | "seated" | "leave-stand" | "leave-walk" | "done";

const ENTER_WALK = 1.05;
const ENTER_SIT = 0.45;
const LEAVE_STAND = 0.35;
const LEAVE_WALK = 1.15;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number): number {
  return t ** 3;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

type AnimState = {
  phase: SeatAnimPhase;
  elapsed: number;
  walkCycle: number;
  opacity: number;
  seatedAmount: number;
};

export function useSeatPresenceAnimation(
  angle: number,
  mode: "enter" | "seated" | "leave",
  onLeaveComplete?: () => void,
) {
  const stateRef = useRef<AnimState>({
    phase: mode === "enter" ? "enter-walk" : mode === "leave" ? "leave-stand" : "seated",
    elapsed: 0,
    walkCycle: 0,
    opacity: 1,
    seatedAmount: mode === "seated" ? 1 : 0,
  });
  const rootRef = useRef<THREE.Group>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const propsRef = useRef<THREE.Group>(null);
  const doneRef = useRef(false);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
    if (mode === "leave" && stateRef.current.phase !== "done") {
      stateRef.current = { phase: "leave-stand", elapsed: 0, walkCycle: 0, opacity: 1, seatedAmount: 1 };
      doneRef.current = false;
    }
  }, [mode]);

  useFrame((_, delta) => {
    const s = stateRef.current;
    s.elapsed += delta;

    if (s.phase === "enter-walk" || s.phase === "leave-walk") {
      s.walkCycle += delta * 4.2;
    }

    let pathT = 0;
    let showProps = true;

    switch (s.phase) {
      case "enter-walk": {
        const p = Math.min(1, s.elapsed / ENTER_WALK);
        pathT = 1 - easeOutCubic(p);
        s.seatedAmount = 0;
        showProps = false;
        if (p >= 1) {
          s.phase = "enter-sit";
          s.elapsed = 0;
        }
        break;
      }
      case "enter-sit": {
        const p = Math.min(1, s.elapsed / ENTER_SIT);
        pathT = 0;
        s.seatedAmount = easeInOutCubic(p);
        showProps = p > 0.35;
        if (p >= 1) {
          s.phase = "seated";
          s.elapsed = 0;
          s.seatedAmount = 1;
          showProps = true;
        }
        break;
      }
      case "seated":
        pathT = 0;
        s.seatedAmount = 1;
        showProps = true;
        break;
      case "leave-stand": {
        const p = Math.min(1, s.elapsed / LEAVE_STAND);
        pathT = 0;
        s.seatedAmount = 1 - easeInOutCubic(p);
        showProps = p < 0.6;
        if (p >= 1) {
          s.phase = "leave-walk";
          s.elapsed = 0;
          s.seatedAmount = 0;
          showProps = false;
        }
        break;
      }
      case "leave-walk": {
        const p = Math.min(1, s.elapsed / LEAVE_WALK);
        pathT = easeInCubic(p);
        s.seatedAmount = 0;
        showProps = false;
        s.opacity = 1 - easeInCubic(Math.max(0, (p - 0.55) / 0.45));
        if (p >= 1 && !doneRef.current) {
          s.phase = "done";
          doneRef.current = true;
          onLeaveComplete?.();
        }
        break;
      }
      case "done":
        s.opacity = 0;
        break;
    }

    const { x, z } = seatPathPoint(angle, pathT);
    const bob =
      s.phase === "enter-walk" || s.phase === "leave-walk" ? Math.sin(s.walkCycle) * 0.035 : 0;

    const root = rootRef.current;
    if (root) root.position.set(x, bob, z);

    const avatar = avatarRef.current;
    if (avatar) avatar.position.y = THREE.MathUtils.lerp(0.14, 0.02, s.seatedAmount);

    const props = propsRef.current;
    if (props) props.visible = showProps;
  });

  return { rootRef, avatarRef, propsRef, stateRef };
}

export function AnimatedSeatBody({
  angle,
  mode,
  onLeaveComplete,
  inCall,
  selected,
  isOperator,
  children,
}: {
  angle: number;
  mode: "enter" | "seated" | "leave";
  onLeaveComplete?: () => void;
  inCall?: boolean;
  selected?: boolean;
  isOperator?: boolean;
  children?: ReactNode;
}) {
  const { rootRef, avatarRef, propsRef, stateRef } = useSeatPresenceAnimation(
    angle,
    mode,
    onLeaveComplete,
  );
  const visRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const s = stateRef.current;
    const vis = visRef.current;
    if (vis) {
      vis.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if ("opacity" in m) {
              m.transparent = s.opacity < 1;
              m.opacity = s.opacity;
            }
          });
        }
      });
    }
  });

  return (
    <group ref={rootRef} rotation={[0, angle + Math.PI, 0]}>
      <group ref={visRef}>
        <group ref={propsRef}>
          <OfficeChair selected={selected || isOperator} />
          <ConferenceLaptop inCall={inCall} active />
        </group>
        <group ref={avatarRef}>
          <StylizedAvatarFigure
            isOperator={isOperator}
            inCall={inCall}
            selected={selected}
            animStateRef={stateRef}
          />
        </group>
      </group>
      {children}
    </group>
  );
}
