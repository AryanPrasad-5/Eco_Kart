import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Group, Mesh } from 'three';

/**
 * WasteX hero visual — an abstract "materials exchange" sculpture:
 * compressed stock blocks (bales, ingots, cubes) hovering in a dark
 * exchange hall, lit by one emerald edge. Premium hardware-product
 * energy, not recycling imagery.
 *
 * Interaction: pointer parallax (the stack leans toward the cursor).
 * Mobile (<720px): renders a reduced static version — no per-frame work.
 * Failure: any WebGL/chunk error is swallowed by the boundary in Hero.
 */

type BlockKind = 'bale' | 'ingot' | 'cube' | 'slab';

interface BlockSpec {
  kind: BlockKind;
  position: readonly [number, number, number];
  scale: number;
  color: string;
  metalness: number;
  roughness: number;
}

const COLORS = {
  plastic: '#3ddc84',
  cardboard: '#c9b48a',
  metal: '#aeb9bd',
  glass: '#7fd0e0',
  ewaste: '#5f7fd0',
  dark: '#2b332e',
} as const;

/** Deterministic layout — a loose vertical stack with orbiters. */
const BLOCKS: BlockSpec[] = [
  { kind: 'bale', position: [0, -1.15, 0], scale: 1.5, color: COLORS.dark, metalness: 0.1, roughness: 0.75 },
  { kind: 'cube', position: [0, 0.25, 0], scale: 1.05, color: COLORS.plastic, metalness: 0.25, roughness: 0.4 },
  { kind: 'ingot', position: [0, 1.45, 0], scale: 0.85, color: COLORS.metal, metalness: 0.9, roughness: 0.25 },
  { kind: 'slab', position: [-1.9, 0.7, 0.5], scale: 0.8, color: COLORS.cardboard, metalness: 0.05, roughness: 0.85 },
  { kind: 'cube', position: [1.95, 0.9, 0.3], scale: 0.6, color: COLORS.glass, metalness: 0.1, roughness: 0.15 },
  { kind: 'cube', position: [-1.75, -1.0, -0.4], scale: 0.5, color: COLORS.ewaste, metalness: 0.5, roughness: 0.4 },
  { kind: 'cube', position: [1.6, -0.9, -0.7], scale: 0.45, color: COLORS.plastic, metalness: 0.25, roughness: 0.45 },
  { kind: 'slab', position: [2.6, 0.2, -0.6], scale: 0.42, color: COLORS.dark, metalness: 0.2, roughness: 0.7 },
  { kind: 'slab', position: [-2.7, 0.0, -0.8], scale: 0.4, color: COLORS.metal, metalness: 0.85, roughness: 0.3 },
];

function Block({ spec, animate }: { spec: BlockSpec; animate: boolean }) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!animate || !mesh.current) return;
    const t = clock.getElapsedTime();
    const [x, y, z] = spec.position;
    mesh.current.position.y = y + Math.sin(t * 0.6 + x * 2.1 + z) * 0.09;
    mesh.current.rotation.y = t * 0.12 + x;
  });

  const geometry = (() => {
    switch (spec.kind) {
      case 'bale': // compressed stock bale — wire-bound box, beveled by scale illusion
        return <boxGeometry args={[1.35, 0.95, 1.05]} />;
      case 'ingot': // extruded metal ingot
        return <cylinderGeometry args={[0.5, 0.5, 1.1, 6]} />;
      case 'slab': // flat sheet stock
        return <boxGeometry args={[1.15, 0.16, 0.9]} />;
      default: // cube — refined material unit
        return <boxGeometry args={[0.95, 0.95, 0.95]} />;
    }
  })();

  return (
    <mesh ref={mesh} position={[spec.position[0], spec.position[1], spec.position[2]]} scale={spec.scale}>
      {geometry}
      <meshStandardMaterial
        color={spec.color}
        metalness={spec.metalness}
        roughness={spec.roughness}
        envMapIntensity={0.6}
      />
    </mesh>
  );
}

/** Pointer parallax rig — rotates the whole stack subtly toward the cursor. */
function ParallaxRig({ children, animate }: { children: React.ReactNode; animate: boolean }) {
  const group = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame(() => {
    if (!animate || !group.current) return;
    group.current.rotation.y += (pointer.x * 0.28 - group.current.rotation.y) * 0.045;
    group.current.rotation.x += (-pointer.y * 0.14 - group.current.rotation.x) * 0.045;
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroScene() {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const compact = typeof window !== 'undefined' && window.innerWidth < 720;
  const animate = !reduced && !compact;

  const blocks = useMemo(() => (compact ? BLOCKS.filter((_, i) => i < 5) : BLOCKS), [compact]);

  return (
    <div className="h-full w-full" aria-hidden>
      <Canvas
        camera={{ position: [0, 0.6, 6.4], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ambientLight intensity={0.72} />
        <directionalLight position={[4, 6, 4]} intensity={1.6} color="#eafff2" />
        <directionalLight position={[-6, -2, -4]} intensity={0.65} color="#34e27a" />
        <pointLight position={[0, -3, 2]} intensity={0.5} color="#34e27a" />
        <ParallaxRig animate={animate}>
          {blocks.map((spec, i) => (
            <Block key={i} spec={spec} animate={animate} />
          ))}
        </ParallaxRig>
      </Canvas>
    </div>
  );
}
