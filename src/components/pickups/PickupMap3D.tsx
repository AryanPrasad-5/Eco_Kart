import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MapView } from '../MapView';
import type { Location, FacilityMatch } from '../../types';

interface PickupMapProps {
  center: Location;
  userLocation: Location | null;
  matches: FacilityMatch[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string | null) => void;
  onLocationChange: (loc: Location) => void;
}

function projectToPlane(loc: Location, center: Location, scale = 1.0) {
  const latRatio = 111.32; 
  const lngRatio = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  
  const dxKm = (loc.lng - center.lng) * lngRatio;
  const dzKm = -(loc.lat - center.lat) * latRatio; 
  
  return new THREE.Vector3(dxKm * scale, 0, dzKm * scale);
}

function CityBlocks() {
  const blocks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 40; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 15,
        z: (Math.random() - 0.5) * 15,
        w: 0.5 + Math.random() * 1.5,
        h: 0.2 + Math.random() * 0.8,
        d: 0.5 + Math.random() * 1.5,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#1a1d1c" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function RouteLine({ start, end }: { start: THREE.Vector3, end: THREE.Vector3 }) {
  const truckRef = useRef<THREE.Mesh>(null);
  
  const points = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y = 0.5; 
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(50);
  }, [start, end]);
  
  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({ color: 0x34e27a, transparent: true, opacity: 0.5 });
  }, []);
  
  const line = useMemo(() => {
    return new THREE.Line(geometry, material);
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (truckRef.current) {
      const t = (clock.getElapsedTime() * 0.2) % 1;
      const pos = new THREE.Vector3();
      const nextPos = new THREE.Vector3();
      const curve = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5).setY(0.5), end);
      curve.getPoint(t, pos);
      curve.getPoint(Math.min(t + 0.01, 1), nextPos);
      truckRef.current.position.copy(pos);
      truckRef.current.lookAt(nextPos);
    }
  });

  return (
    <group>
      <primitive object={line} />
      <mesh ref={truckRef}>
        <boxGeometry args={[0.2, 0.2, 0.4]} />
        <meshStandardMaterial color="#34e27a" />
      </mesh>
    </group>
  );
}

function MapScene({ center, matches, selectedFacilityId, onSelectFacility }: PickupMapProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: any) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
    e.target.setPointerCapture(e.pointerId);
  };
  
  const handlePointerUp = (e: any) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: any) => {
    if (isDragging && groupRef.current) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      groupRef.current.rotation.y += dx * 0.01;
      groupRef.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, groupRef.current.rotation.x + dy * 0.01));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const scale = 2.0; 
  
  const selectedMatch = matches.find(m => m.facility.facility_id === selectedFacilityId);
  const youPos = new THREE.Vector3(0, 0, 0); 
  
  return (
    <group 
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <gridHelper args={[30, 30, 0x34e27a, 0x232725]} position={[0, -0.01, 0]} />
      <CityBlocks />
      
      <mesh position={youPos}>
        <coneGeometry args={[0.2, 0.6, 16]} />
        <meshStandardMaterial color="#f4744c" />
      </mesh>

      {matches.map((m) => {
        const pos = projectToPlane(m.facility, center, scale);
        const isSelected = m.facility.facility_id === selectedFacilityId;
        return (
          <mesh 
            key={m.facility.facility_id} 
            position={[pos.x, isSelected ? 0.8 : 0.5, pos.z]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectFacility(m.facility.facility_id);
            }}
          >
            <cylinderGeometry args={[0.3, 0.3, isSelected ? 1.6 : 1.0, 16]} />
            <meshStandardMaterial color={isSelected ? '#34e27a' : '#145b35'} opacity={0.9} transparent />
          </mesh>
        );
      })}

      {selectedMatch && (
        <RouteLine 
          start={youPos} 
          end={projectToPlane(selectedMatch.facility, center, scale)} 
        />
      )}
    </group>
  );
}

export default function PickupMap3D(props: PickupMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    try {
      const canvas = document.createElement('canvas');
      setHasWebGL(!!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))));
    } catch (e) {
      setHasWebGL(false);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]) setActive(entries[0].isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      mediaQuery.removeEventListener('change', handler);
      observer.disconnect();
    };
  }, []);

  if (!hasWebGL || prefersReducedMotion) {
    return (
      <MapView
        center={props.center}
        userLocation={props.userLocation}
        matches={props.matches}
        selectedFacilityId={props.selectedFacilityId}
        onSelectFacility={props.onSelectFacility}
        draggableMarker
        fullHeight
        onLocationChange={props.onLocationChange}
        caption="Drag the pin to set your exact pickup location."
      />
    );
  }

  return (
    <div className="relative h-full w-full min-h-[400px] cursor-move bg-surface rounded-lg overflow-hidden" ref={containerRef}>
      <div className="absolute top-4 left-4 z-10 text-xs text-ink-faint font-mono bg-void/80 px-2 py-1 rounded backdrop-blur pointer-events-none">
        Drag to rotate · Tap to select
      </div>
      <Canvas
        camera={{ position: [0, 8, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(0x0d0f0e, 1)}
        frameloop={active ? 'always' : 'never'}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <MapScene {...props} />
      </Canvas>
    </div>
  );
}
