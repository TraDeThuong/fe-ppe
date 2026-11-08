"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

import {
  Activity,
  Box,
  Rotate3D,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/* =========================================================
   GLB HARD HAT MODEL
========================================================= */

function HardHatModel() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/hard-hat.glb");

  const model = useMemo(() => {
    const cloned = scene.clone(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    cloned.position.sub(center);

    const maxDimension = Math.max(size.x, size.y, size.z);

    if (maxDimension > 0) {
      cloned.scale.setScalar(2.1 / maxDimension);
    }

    return cloned;
  }, [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.y += delta * 0.35;

    groupRef.current.position.y =
      -0.05 +
      Math.sin(state.clock.elapsedTime * 1.1) * 0.035;
  });

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload("/models/hard-hat.glb");

/* =========================================================
   LOADING FALLBACK
========================================================= */

function ModelLoader() {
  return (
    <mesh>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#A2CA6C" wireframe />
    </mesh>
  );
}

/* =========================================================
   HELMET SHOWCASE
========================================================= */

export interface HelmetShowcaseProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export function HelmetShowcase({
  className = "",
  title = "Safety First",
  subtitle = "Personal Protective Equipment",
}: HelmetShowcaseProps) {
  return (
    <section
      className={[
        "relative isolate w-full overflow-hidden rounded-2xl sm:rounded-[26px]",
        "border border-border/40 bg-surface/90 p-3 sm:p-4",
        "shadow-[4px_6px_16px_rgba(0,0,0,0.03),-3px_-3px_10px_rgba(255,255,255,0.6)]",
        "dark:border-white/[0.08] dark:bg-card/40 dark:shadow-[0_8px_24px_rgba(0,0,0,0.25)]",
        "flex flex-col justify-between",
        className,
      ].join(" ")}
    >
      {/* Outer highlight */}
      <div className="pointer-events-none absolute inset-px rounded-[25px] border border-white/50 dark:border-white/[0.04]" />

      {/* Main showcase */}
      <div
        className={[
          "relative min-h-[410px] flex-1 overflow-hidden rounded-[20px]",
          "border border-border/30 dark:border-white/[0.05]",
          "bg-background/80 dark:bg-background/30",
          "shadow-[inset_2px_2px_6px_rgba(0,0,0,0.03)] dark:shadow-none",
        ].join(" ")}
      >
        {/* =================================================
            AMBIENT BACKGROUND
        ================================================= */}

        {/* Primary + Accent lighting */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_43%,var(--primary)/14%,transparent_48%),radial-gradient(ellipse_at_10%_10%,var(--accent)/12%,transparent_40%),radial-gradient(ellipse_at_90%_100%,var(--primary)/8%,transparent_45%)]" />

        {/* Soft central glow */}
        <div className="pointer-events-none absolute left-1/2 top-[48%] h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.07] blur-[55px]" />

        {/* Subtle technical grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(var(--muted-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--muted-foreground) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            maskImage:
              "radial-gradient(ellipse at center, black, transparent 75%)",
          }}
        />

        {/* =================================================
            DECORATIVE RINGS
        ================================================= */}

        <div className="pointer-events-none absolute left-1/2 top-[51%] aspect-square w-[min(74%,320px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] dark:shadow-none" />

        <div className="pointer-events-none absolute left-1/2 top-[51%] aspect-square w-[min(57%,245px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-accent/40" />

        <div className="pointer-events-none absolute left-1/2 top-[51%] aspect-square w-[min(39%,170px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="absolute inset-x-5 top-5 z-10 flex items-start justify-between sm:inset-x-7 sm:top-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative h-2 w-2 rounded-full bg-primary" />
              </span>

              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                PPE 3D MODEL
              </span>
            </div>

            <h3 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {title}
            </h3>

            <p className="mt-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
              {subtitle}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/40 bg-surface text-primary shadow-[4px_4px_10px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-card/60 dark:shadow-none">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
        </div>

        {/* =================================================
            3D CANVAS
        ================================================= */}

        <div className="absolute inset-x-0 bottom-[65px] top-[65px] z-[2]">
          <Canvas
            shadows
            dpr={[1, 1.75]}
            camera={{
              position: [0, 0.35, 4.2],
              fov: 36,
            }}
            gl={{
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
            }}
          >
            {/* Soft studio lighting */}
            <ambientLight intensity={1.2} />

            <hemisphereLight
              color="#ffffff"
              groundColor="#c9c1b1"
              intensity={1.4}
            />

            <directionalLight
              position={[4, 5, 5]}
              intensity={2.2}
              color="#ffffff"
              castShadow
            />

            <directionalLight
              position={[-4, 2, -3]}
              intensity={1.6}
              color="#D9EDB8"
            />

            <spotLight
              position={[0, 5, 2]}
              intensity={25}
              angle={0.5}
              penumbra={1}
              color="#FFF1D9"
            />

            <Suspense fallback={<ModelLoader />}>
              <HardHatModel />

              <ContactShadows
                position={[0, -0.85, 0]}
                opacity={0.22}
                scale={3.5}
                blur={2.5}
                far={2}
                color="#536044"
              />
            </Suspense>

            <OrbitControls
              makeDefault
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 3.5}
              maxPolarAngle={Math.PI / 1.7}
              rotateSpeed={0.7}
            />
          </Canvas>
        </div>

        {/* =================================================
            DECORATIVE LABELS
        ================================================= */}

        <div className="pointer-events-none absolute left-5 top-[48%] z-[3] hidden -translate-y-1/2 flex-col gap-1 sm:flex">
          <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
            OBJECT
          </span>
          <span className="font-mono text-[10px] font-bold text-primary/70">
            PPE_001
          </span>
        </div>

        <div className="pointer-events-none absolute right-5 top-[48%] z-[3] hidden -translate-y-1/2 flex-col items-end gap-1 sm:flex">
          <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
            VIEW
          </span>
          <span className="font-mono text-[10px] font-bold text-primary/70">
            360°
          </span>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="absolute inset-x-4 bottom-4 z-10 flex items-center justify-between gap-2 sm:inset-x-6 sm:bottom-5">
          {/* Safety standard */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-surface text-primary shadow-[2px_2px_6px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-card/60 dark:shadow-none">
              <Activity size={16} />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Safety Standard
              </p>

              <p className="truncate text-[10px] font-extrabold text-foreground sm:text-xs">
                ANSI Z89.1 Type 1 / Class E
              </p>
            </div>
          </div>

          {/* Rotation hint */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border/40 bg-surface px-3 py-2 text-[9px] font-bold text-muted-foreground shadow-[2px_2px_6px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-card/60 dark:shadow-none sm:text-[10px]">
            <Rotate3D size={14} className="text-primary" />
            <span>Drag to rotate</span>
          </div>
        </div>

        {/* =================================================
            CORNER DECORATIONS
        ================================================= */}

        <div className="pointer-events-none absolute right-6 top-[105px] flex items-center gap-1.5 opacity-40">
          <Sparkles size={11} className="text-primary" />
          <span className="font-mono text-[8px] font-bold tracking-widest text-muted-foreground">
            3D VIEW
          </span>
        </div>

        {/* Bottom accent line */}
        <div className="pointer-events-none absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      </div>
    </section>
  );
}