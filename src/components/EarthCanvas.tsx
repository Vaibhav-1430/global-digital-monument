'use client';

import React, { useRef, useMemo, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LightMarkerData } from '@/types';

/**
 * Convert real geographic latitude and longitude to 3D Cartesian coordinates
 * on a sphere of given radius.
 *
 * Coordinates align with the model's physical space:
 * - Latitude: +90° (North Pole) at +Y, -90° (South Pole) at -Y, Equator at Y = 0.
 * - Longitude: 0° (Prime Meridian) at +X, 90°W (Americas) at +Z, 90°E (Asia) at -Z.
 */
export function latLngToSphere(lat: number, lng: number, radius = 2.016): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

// Atmospheric Rim Fresnel Shader
const AtmosphereShader = {
  uniforms: {
    color: { value: new THREE.Color('#7DD3FC') },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 viewDir = normalize(-vPosition);
      float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
      float intensity = pow(rim, 6.0) * 0.45;
      gl_FragColor = vec4(color, intensity);
    }
  `,
};

// Reusable individual golden light marker attached to the planet surface
function GoldenLightMarker({
  marker,
  isSelected,
  onSelect,
}: {
  marker: LightMarkerData;
  isSelected: boolean;
  onSelect: (m: LightMarkerData) => void;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLngToSphere(marker.lat, marker.lng, 2.016), [marker.lat, marker.lng]);
  const isLeader = marker.rank === 1;
  const isTop = !!marker.isTopContributor || isLeader;

  // Gentle, elegant breathing pulse on the selected marker or #1 World Leader beacon
  useFrame(({ clock }) => {
    if (haloRef.current) {
      if (isSelected) {
        const pulse = 1.0 + Math.sin(clock.elapsedTime * 3.5) * 0.18;
        haloRef.current.scale.set(pulse, pulse, pulse);
      } else if (isLeader) {
        const pulse = 1.0 + Math.sin(clock.elapsedTime * 2.2) * 0.15;
        haloRef.current.scale.set(pulse, pulse, pulse);
      }
    }
  });

  return (
    <group position={pos}>
      {/* Core Golden Beacon Point */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(marker);
        }}
        onPointerDown={(e) => {
          // Prevent marker clicks from triggering orbit drag
          e.stopPropagation();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[isSelected ? 0.036 : isLeader ? 0.028 : isTop ? 0.022 : 0.016, 16, 16]} />
        <meshBasicMaterial color={isSelected ? '#FFFFFF' : isLeader ? '#FFFCEB' : isTop ? '#FFF5D1' : '#FFE89E'} />
      </mesh>

      {/* Subtle Radiant Halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[isSelected ? 0.08 : isLeader ? 0.062 : isTop ? 0.046 : 0.032, 16, 16]} />
        <meshBasicMaterial
          color="#FFC857"
          transparent
          opacity={isSelected ? 0.8 : isLeader ? 0.58 : isTop ? 0.42 : 0.28}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Distinctive World Leader Halo Ring */}
      {isLeader && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.04, 0.058, 24]} />
          <meshBasicMaterial
            color="#FFC857"
            side={THREE.DoubleSide}
            transparent
            opacity={0.45}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

interface EarthModelProps {
  markers: LightMarkerData[];
  selectedMarkerId?: string | null;
  onSelectMarker: (marker: LightMarkerData | null) => void;
  autoRotate?: boolean;
  isInteractingRef: React.MutableRefObject<boolean>;
  globeRotationRef: React.MutableRefObject<number>;
  scale?: number;
}

function EarthModel({
  markers,
  selectedMarkerId,
  onSelectMarker,
  autoRotate = true,
  isInteractingRef,
  globeRotationRef,
  scale = 1,
}: EarthModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentSpeedRef = useRef(0.045);
  const { scene } = useGLTF('/earth.glb');

  // Load the 8K photographic satellite texture
  const earthTexture = useTexture('/earth_diffuse.jpg');
  earthTexture.colorSpace = THREE.SRGBColorSpace;
  earthTexture.anisotropy = 16;

  // Clone scene and apply 8K texture with physical PBR properties
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // Compute bounding box to normalize model to radius = 2.0 units exactly
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const baseRadius = 2.0;
    const normScale = (baseRadius * 2) / (maxDim || 1);
    clone.scale.set(normScale, normScale, normScale);

    // Apply high-fidelity material with the 8K Earth texture
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          map: earthTexture,
          roughness: 0.68,
          metalness: 0.06,
        });
      }
    });

    return clone;
  }, [scene, earthTexture]);

  // Atmosphere rim material
  const atmosphereMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      uniforms: THREE.UniformsUtils.clone(AtmosphereShader.uniforms),
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  // Frame animation loop: Continuous smooth axial rotation with acceleration damping
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Track active rotation angle in the shared ref for camera flight calculations
    globeRotationRef.current = groupRef.current.rotation.y;

    const shouldRotate = autoRotate && !isInteractingRef.current && !selectedMarkerId;
    const targetSpeed = shouldRotate ? 0.045 : 0;

    // Smoothly ease rotation speed in/out
    currentSpeedRef.current = THREE.MathUtils.lerp(
      currentSpeedRef.current,
      targetSpeed,
      1.0 - Math.exp(-delta * 3.5)
    );

    if (Math.abs(currentSpeedRef.current) > 0.0001) {
      groupRef.current.rotation.y += delta * currentSpeedRef.current;
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Real Earth GLB model */}
      <primitive object={clonedScene} />

      {/* Atmospheric Rim Halo */}
      <mesh>
        <sphereGeometry args={[2.022, 64, 64]} />
        <primitive object={atmosphereMat} attach="material" />
      </mesh>

      {/* Golden Light Beacons attached to the Earth surface */}
      {markers.map((marker) => (
        <GoldenLightMarker
          key={marker.id}
          marker={marker}
          isSelected={selectedMarkerId === marker.id}
          onSelect={onSelectMarker}
        />
      ))}
    </group>
  );
}

interface CameraFlightProps {
  selectedMarker: LightMarkerData | null;
  isInteractingRef: React.MutableRefObject<boolean>;
  globeRotationRef: React.MutableRefObject<number>;
  controlsRef: React.MutableRefObject<any>;
}

// Controller managing camera flight transitions, zoom limits, and orbit controls
function CameraFlightAndControls({
  selectedMarker,
  isInteractingRef,
  globeRotationRef,
  controlsRef,
}: CameraFlightProps) {
  const { camera } = useThree();
  const flightTargetRef = useRef<{ dir: THREE.Vector3; dist: number } | null>(null);
  const isFlyingRef = useRef(false);
  const prevMarkerIdRef = useRef<string | null>(null);

  // Compute camera flight target when marker selection changes
  useEffect(() => {
    if (selectedMarker) {
      // 1. Calculate the marker's local surface coordinates
      const localCoords = latLngToSphere(selectedMarker.lat, selectedMarker.lng, 2.016);
      const localVec = new THREE.Vector3(...localCoords);

      // 2. Transform by the current rotation of the globe to obtain current world direction
      const currentRotY = globeRotationRef.current || 0;
      const worldVec = localVec.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotY);

      // 3. Set camera target looking directly at the marker from viewing distance of 4.15
      flightTargetRef.current = {
        dir: worldVec.normalize(),
        dist: 4.15,
      };
      isFlyingRef.current = true;
      isInteractingRef.current = false;
    } else if (prevMarkerIdRef.current && !selectedMarker) {
      // Return smoothly to default exploration distance (6.4) along the current viewing line
      const currentDir = camera.position.clone().normalize();
      flightTargetRef.current = {
        dir: currentDir,
        dist: 6.4,
      };
      isFlyingRef.current = true;
    }

    prevMarkerIdRef.current = selectedMarker?.id || null;
  }, [selectedMarker, camera, globeRotationRef, isInteractingRef]);

  // Frame animation loop: smooth camera flight with spherical arc interpolation
  useFrame((_, delta) => {
    if (isFlyingRef.current && flightTargetRef.current && !isInteractingRef.current) {
      const target = flightTargetRef.current;
      const currentDir = camera.position.clone().normalize();
      const currentDist = camera.position.length();

      // Exponential damping factor for smooth cinematic ease-out
      const damp = 1.0 - Math.exp(-delta * 4.2);

      // Smoothly slerp/lerp direction and distance
      currentDir.lerp(target.dir, damp).normalize();
      const newDist = THREE.MathUtils.lerp(currentDist, target.dist, damp);

      camera.position.copy(currentDir).multiplyScalar(newDist);

      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }

      // Check arrival tolerance
      const angleDelta = camera.position.clone().normalize().angleTo(target.dir);
      const distDelta = Math.abs(newDist - target.dist);

      if (angleDelta < 0.005 && distDelta < 0.02) {
        isFlyingRef.current = false;
        flightTargetRef.current = null;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
      minDistance={3.2}
      maxDistance={9.8}
      enablePan={false}
      onStart={() => {
        isInteractingRef.current = true;
        // User manual drag immediately cancels any ongoing automated camera flight
        isFlyingRef.current = false;
        flightTargetRef.current = null;
      }}
      onEnd={() => {
        setTimeout(() => {
          isInteractingRef.current = false;
        }, 1400);
      }}
    />
  );
}

interface EarthCanvasProps {
  markers: LightMarkerData[];
  selectedMarkerId?: string | null;
  onSelectMarker: (marker: LightMarkerData | null) => void;
  onLocationPicked?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
  autoRotate?: boolean;
  earthScale?: number;
  earthOpacity?: number;
  onModelReady?: () => void;
}

export default function EarthCanvas({
  markers,
  selectedMarkerId,
  onSelectMarker,
  onLocationPicked,
  isPickingLocation = false,
  autoRotate = true,
  earthScale = 1,
  earthOpacity = 1,
  onModelReady,
}: EarthCanvasProps) {
  const isInteractingRef = useRef(false);
  const globeRotationRef = useRef(0);
  const controlsRef = useRef<any>(null);

  const selectedMarker = useMemo(() => {
    return selectedMarkerId ? markers.find((m) => m.id === selectedMarkerId) || null : null;
  }, [selectedMarkerId, markers]);

  useEffect(() => {
    if (onModelReady) {
      onModelReady();
    }
  }, [onModelReady]);

  // Click on sphere to pick coordinates, taking active planetary rotation into account
  const handlePointerDown = useCallback(
    (e: any) => {
      if (!isPickingLocation || !onLocationPicked) return;

      if (e.point) {
        const p = e.point.clone().normalize();
        // Counter-rotate intersection point by the current globe rotation to get fixed surface coordinates
        p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -globeRotationRef.current);

        const lat = Math.asin(Math.max(-1, Math.min(1, p.y))) * (180 / Math.PI);
        const lng = Math.atan2(p.z, -p.x) * (180 / Math.PI) - 180;
        const normalizedLng = ((((lng + 180) % 360) + 360) % 360) - 180;

        onLocationPicked(Number(lat.toFixed(4)), Number(normalizedLng.toFixed(4)));
      }
    },
    [isPickingLocation, onLocationPicked]
  );

  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000 z-1 pointer-events-auto"
      style={{
        opacity: earthOpacity,
        background: 'transparent',
      }}
      onClick={handlePointerDown}
    >
      <Canvas
        camera={{ position: [0, 0, 6.4], fov: 42 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        {/* Physical Sun Directional Lighting & Atmospheric Fill */}
        <directionalLight position={[6, 2.2, 5]} intensity={2.6} color="#FFFFFF" />
        <ambientLight intensity={0.45} color="#B8D8FF" />
        <pointLight position={[-8, -2, -6]} intensity={0.2} color="#7DD3FC" />

        <Suspense fallback={null}>
          <EarthModel
            markers={markers}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={onSelectMarker}
            autoRotate={autoRotate}
            isInteractingRef={isInteractingRef}
            globeRotationRef={globeRotationRef}
            scale={earthScale}
          />
        </Suspense>

        <CameraFlightAndControls
          selectedMarker={selectedMarker}
          isInteractingRef={isInteractingRef}
          globeRotationRef={globeRotationRef}
          controlsRef={controlsRef}
        />
      </Canvas>
    </div>
  );
}

// Preload assets for instantaneous rendering
useGLTF.preload('/earth.glb');
useTexture.preload('/earth_diffuse.jpg');
