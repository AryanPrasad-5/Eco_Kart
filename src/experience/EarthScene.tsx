import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TEXTURES, EARTH_FALLBACK } from '../assets/credits';

/* ── Shaders ────────────────────────────────────────────────────────────
   Photographic day (NASA Blue Marble) blends into real city lights
   (Black Marble) across a soft terminator; oceans take a specular sun
   glint driven by the topology map; a fresnel rim + back-side shell
   give the thin blue atmosphere. */

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uBump;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);

    float sun = dot(N, uSunDir);
    // soft terminator: ~±0.12 around the day/night boundary
    float dayMix = smoothstep(-0.12, 0.12, sun);

    vec3 dayCol = texture2D(uDay, vUv).rgb;
    vec3 lights = texture2D(uNight, vUv).rgb * vec3(1.0, 0.88, 0.62) * 1.9;
    vec3 color = mix(lights, dayCol * (0.25 + 0.85 * clamp(sun, 0.0, 1.0)), dayMix);

    // oceans: focused specular sun glint where the topology map is dark (sea level)
    float land = texture2D(uBump, vUv).r;
    vec3 R = reflect(-uSunDir, N);
    float spec = pow(clamp(dot(R, V), 0.0, 1.0), 140.0) * (1.0 - land) * dayMix;
    color += vec3(1.0, 0.95, 0.82) * spec * 0.45;

    // thin blue limb
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
    color += vec3(0.32, 0.55, 1.0) * rim * (0.55 * dayMix + 0.12);

    // faint ambient so the night side never crushes to pure black
    color += dayCol * 0.02;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  uniform vec3 uSunDir;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.4);
    float sun = clamp(dot(N, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
    float a = rim * (0.30 + 0.55 * sun);
    gl_FragColor = vec4(vec3(0.35, 0.58, 1.0) * a, a * 0.9);
  }
`;

const AUTO_SPEED = 0.0028; // rad/frame at 60fps — a slow, dignified spin
const STAR_COUNT = 2200;

interface EarthSceneProps {
  /** Full-bleed fixed canvas behind the page; scroll dollies the camera. */
  className?: string;
}

/**
 * The Earth. Drag rotates it (inertia, damped back to a slow spin);
 * page scroll dollies the camera from a full-disc view toward the limb;
 * `prefers-reduced-motion` stills the spin and freezes the dolly.
 * Any WebGL failure swaps in the real Earth photograph — never a crash.
 */
export default function EarthScene({ className }: EarthSceneProps) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const spin = useRef(AUTO_SPEED);
  const scroll01 = useRef(0);
  const reduced = useReducedMotion();

  // scroll progress 0 (hero) → 1 (chapters) drives the camera dolly
  useEffect(() => {
    const read = () => {
      const span = Math.max(1, window.innerHeight * 1.4);
      scroll01.current = Math.min(1, Math.max(0, window.scrollY / span));
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  // drag → inertia (touch + mouse)
  useEffect(() => {
    if (failed) return;
    let dragging = false;
    let lastX = 0;
    const el = document.getElementById('earth-stage');
    if (!el) return;

    const down = (x: number) => {
      dragging = true;
      lastX = x;
    };
    const move = (x: number) => {
      if (!dragging) return;
      spin.current = THREE.MathUtils.clamp(spin.current + (x - lastX) * 0.00035, -0.09, 0.09);
      lastX = x;
    };
    const up = () => {
      dragging = false;
    };

    const onDown = (e: PointerEvent) => down(e.clientX);
    const onTouchStart = (e: TouchEvent) => e.touches[0] && down(e.touches[0].clientX);
    const onTouchMove = (e: TouchEvent) => e.touches[0] && move(e.touches[0].clientX);

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', (e) => move(e.clientX));
    window.addEventListener('pointerup', up);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', up);
    };
  }, [failed]);

  if (failed) {
    return (
      <div className={className} id="earth-stage" aria-hidden>
        <img src={EARTH_FALLBACK.src} alt="" className="exp-earth-fallback" draggable={false} />
      </div>
    );
  }

  return (
    <div className={className} id="earth-stage" data-ready={ready || undefined}>
      <Canvas
        camera={{ fov: 42, position: [0, 0, 3.4], near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        onError={() => setFailed(true)}
      >
        <Rig scroll01={scroll01} reduced={reduced} />
        <Earth spin={spin} reduced={reduced} onReady={() => setReady(true)} />
        <Stars />
      </Canvas>
    </div>
  );
}

/** Camera dolly: fov 42 → 24 as the page scrolls into the story. */
function Rig({ scroll01, reduced }: { scroll01: React.MutableRefObject<number>; reduced: boolean }) {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  useFrame(() => {
    const targetFov = reduced ? 42 : THREE.MathUtils.lerp(42, 24, easeInOut(scroll01.current));
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov += (targetFov - cam.fov) * 0.08;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

function Earth({
  spin,
  reduced,
  onReady,
}: {
  spin: React.MutableRefObject<number>;
  reduced: boolean;
  onReady: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [tex, setTex] = useState<{ day: THREE.Texture; night: THREE.Texture; bump: THREE.Texture } | null>(null);
  const { gl } = useThree();

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const aniso = gl.capabilities.getMaxAnisotropy();
    let alive = true;
    Promise.all(
      [TEXTURES.day, TEXTURES.night, TEXTURES.bump].map(
        (p) => new Promise<THREE.Texture>((res, rej) => loader.load(p, (t) => res(t), undefined, rej)),
      ),
    )
      .then((loaded) => {
        if (!alive) return;
        const [day, night, bump] = loaded as [THREE.Texture, THREE.Texture, THREE.Texture];
        for (const t of [day, night, bump]) {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = aniso;
        }
        setTex({ day, night, bump });
        onReady();
      })
      .catch(() => {
        /* safety timeout in ExperiencePage shows the fallback */
      });
    return () => {
      alive = false;
    };
  }, [gl, onReady]);

  const uniforms = useMemo(
    () => ({
      uDay: { value: null as THREE.Texture | null },
      uNight: { value: null as THREE.Texture | null },
      uBump: { value: null as THREE.Texture | null },
      uSunDir: { value: new THREE.Vector3(-1.15, 0.32, 0.65).normalize() },
    }),
    [],
  );

  useEffect(() => {
    if (tex) {
      uniforms.uDay.value = tex.day;
      uniforms.uNight.value = tex.night;
      uniforms.uBump.value = tex.bump;
    }
  }, [tex, uniforms]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    // damped return to the slow auto spin after a drag
    spin.current += (AUTO_SPEED - spin.current) * Math.min(1, delta * 1.4);
    if (!reduced) g.rotation.y += spin.current;
    g.rotation.x = 0.16; // gentle axial tilt toward the viewer
  });

  return (
    <group ref={group} rotation={[0.16, 0, 0]}>
      <mesh>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={ATMO_FRAG}
          uniforms={useMemo(() => ({ uSunDir: uniforms.uSunDir }), [uniforms])}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      // far shell around the scene
      const v = new THREE.Vector3().randomDirection().multiplyScalar(18 + Math.random() * 22);
      arr.set([v.x, v.y, v.z], i * 3);
    }
    return arr;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} sizeAttenuation color="#cfd8e6" transparent opacity={0.8} />
    </points>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
