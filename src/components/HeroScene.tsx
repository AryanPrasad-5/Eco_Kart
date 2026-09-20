import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const COLORS = [
  '#4db9e6', // plastic
  '#f2c94c', // paper
  '#a67c52', // cardboard
  '#9ca3af', // metal
  '#8b5cf6', // glass
  '#ec4899', // ewaste
];

function Bins() {
  return (
    <group position={[0, -1.8, 0]}>
      {COLORS.map((color, i) => (
        <group key={i} position={[-2.5 + i * 1.0, 0, 0]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial color={color} transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(0.8, 0.8, 0.8)]} />
              <lineBasicMaterial color={color} opacity={0.5} transparent />
            </lineSegments>
          </mesh>
          {/* Inside fill to simulate some content */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.7, 0.4, 0.7]} />
            <meshStandardMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GridFloor() {
  return (
    <gridHelper args={[20, 20, 0x34e27a, 0x232725]} position={[0, -1.8, 0]} />
  );
}

function ScanRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.5, 0.05, 16, 64]} />
      <meshBasicMaterial color="#34e27a" transparent opacity={0.8} />
    </mesh>
  );
}

function FallingItems({ labelRef }: { labelRef: React.RefObject<HTMLDivElement> }) {
  const groupRef = useRef<THREE.Group>(null);
  const itemsRef = useRef<THREE.Mesh[]>([]);

  // We will have one active item falling at a time.
  // It falls from y=3 to y=0.5 (scan ring), pauses briefly,
  // then arcs into one of the bins.
  const state = useRef({
    t: 0,
    itemIndex: 0,
    phase: 0, // 0: falling to ring, 1: scanning, 2: arcing to bin
  });

  useFrame((_, delta) => {
    const s = state.current;
    s.t += delta;

    if (!itemsRef.current[0]) return;

    // Reset all items to hidden initially
    itemsRef.current.forEach((mesh, i) => {
      if (i !== s.itemIndex) {
        mesh.visible = false;
      }
    });

    const activeItem = itemsRef.current[s.itemIndex];
    activeItem.visible = true;

    // Bin target X positions based on material index
    // Material mapping: 0=plastic, 1=paper, 2=cardboard, 3=metal, 4=glass, 5=ewaste
    const targetX = -2.5 + s.itemIndex * 1.0;
    const targetY = -1.6;

    if (s.phase === 0) {
      // Falling to ring
      const progress = Math.min(s.t / 1.0, 1);
      activeItem.position.set(0, 3 - progress * 2.5, 0);
      activeItem.rotation.x += delta * 2;
      activeItem.rotation.y += delta * 1.5;
      
      if (labelRef.current) {
        labelRef.current.style.opacity = '0';
      }

      if (progress >= 1) {
        s.phase = 1;
        s.t = 0;
      }
    } else if (s.phase === 1) {
      // Scanning (hover briefly)
      activeItem.position.y = 0.5 + Math.sin(s.t * 10) * 0.05;
      activeItem.rotation.y += delta * 4;

      if (labelRef.current) {
        labelRef.current.style.opacity = '1';
        const labels = [
          "PET BOTTLE - PLASTIC - 91%",
          "OFFICE PAPER - PAPER - 96%",
          "CARTON - CARDBOARD - 88%",
          "ALUMINIUM - METAL - 99%",
          "JAR - GLASS - 94%",
          "CIRCUIT - E-WASTE - 82%"
        ];
        labelRef.current.innerText = labels[s.itemIndex];
        labelRef.current.style.color = COLORS[s.itemIndex];
        labelRef.current.style.borderColor = COLORS[s.itemIndex];
      }

      if (s.t > 1.2) {
        s.phase = 2;
        s.t = 0;
      }
    } else if (s.phase === 2) {
      // Arcing to bin
      const progress = Math.min(s.t / 0.8, 1);
      
      // Arc math
      const startX = 0;
      const startY = 0.5;
      
      const currentX = startX + (targetX - startX) * progress;
      // Parabola for Y
      const arcHeight = 1.0;
      const currentY = startY + (targetY - startY) * progress + Math.sin(progress * Math.PI) * arcHeight;

      activeItem.position.set(currentX, currentY, 0);
      activeItem.scale.setScalar(1 - progress * 0.5); // Shrink as it goes in
      activeItem.rotation.x += delta * 4;
      activeItem.rotation.y += delta * 4;

      if (labelRef.current && progress > 0.2) {
        labelRef.current.style.opacity = '0';
      }

      if (progress >= 1) {
        activeItem.visible = false;
        activeItem.scale.setScalar(1);
        s.phase = 0;
        s.t = 0;
        s.itemIndex = (s.itemIndex + 1) % 6;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Plastic Bottle */}
      <mesh ref={(el) => (itemsRef.current[0] = el!)} visible={false}>
        <cylinderGeometry args={[0.2, 0.2, 0.8, 16]} />
        <meshStandardMaterial color={COLORS[0]} roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Paper Block */}
      <mesh ref={(el) => (itemsRef.current[1] = el!)} visible={false}>
        <boxGeometry args={[0.6, 0.2, 0.4]} />
        <meshStandardMaterial color={COLORS[1]} roughness={0.8} />
      </mesh>
      {/* Cardboard Box */}
      <mesh ref={(el) => (itemsRef.current[2] = el!)} visible={false}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={COLORS[2]} roughness={0.9} />
      </mesh>
      {/* Metal Can */}
      <mesh ref={(el) => (itemsRef.current[3] = el!)} visible={false}>
        <cylinderGeometry args={[0.25, 0.25, 0.6, 16]} />
        <meshStandardMaterial color={COLORS[3]} roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Glass Jar */}
      <mesh ref={(el) => (itemsRef.current[4] = el!)} visible={false}>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
        <meshStandardMaterial color={COLORS[4]} transparent opacity={0.6} roughness={0.1} />
      </mesh>
      {/* E-Waste Board */}
      <mesh ref={(el) => (itemsRef.current[5] = el!)} visible={false}>
        <boxGeometry args={[0.7, 0.05, 0.4]} />
        <meshStandardMaterial color={COLORS[5]} roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

export default function HeroScene() {
  const labelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance: only one WebGL context visible at a time, pause rendering when off-screen
  // We use IntersectionObserver to pause the frameloop when out of view
  const [active, setActive] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative h-full w-full" ref={containerRef} aria-hidden>
      <Canvas
        camera={{ position: [0, 1.5, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        frameloop={active ? 'always' : 'never'}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[0, 0.5, 0]} intensity={2} color="#34e27a" distance={4} />
        <GridFloor />
        <ScanRing />
        <Bins />
        <FallingItems labelRef={labelRef} />
      </Canvas>
      <div
        ref={labelRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120px] rounded-full border border-current bg-surface/90 px-3 py-1 font-mono text-[10px] tracking-wider transition-opacity duration-200"
        style={{ opacity: 0, color: '#34e27a' }}
      >
        SCANNING...
      </div>
    </div>
  );
}
