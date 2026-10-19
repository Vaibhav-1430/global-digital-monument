'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { LightMarkerData } from '@/types';

export interface CesiumGlobeHandle {
  flyToLocation: (lat: number, lng: number, height?: number, duration?: number) => void;
  resetView: () => void;
  igniteLightEffect: (lat: number, lng: number) => void;
}

interface CesiumGlobeProps {
  markers: LightMarkerData[];
  selectedMarkerId?: string | null;
  onSelectMarker: (marker: LightMarkerData | null) => void;
  onLocationPicked?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
  autoRotate?: boolean;
  earthScale?: number;
  earthOpacity?: number;
  onGlobeReady?: () => void;
}

// Generate small, warm, jewel-like light beacon
function createGlowCanvas(isTopLeader = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 36;
  canvas.height = 36;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const center = 18;

  // Outer delicate atmospheric halo
  const outerGrad = ctx.createRadialGradient(center, center, 0, center, center, 17);
  outerGrad.addColorStop(0, isTopLeader ? 'rgba(255, 200, 87, 0.4)' : 'rgba(255, 200, 87, 0.25)');
  outerGrad.addColorStop(0.5, 'rgba(255, 180, 50, 0.08)');
  outerGrad.addColorStop(1, 'rgba(255, 200, 87, 0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(center, center, 17, 0, Math.PI * 2);
  ctx.fill();

  // Core golden bloom
  const coreGrad = ctx.createRadialGradient(center, center, 0, center, center, 8);
  coreGrad.addColorStop(0, '#FFFFFF');
  coreGrad.addColorStop(0.35, '#FFE9A0');
  coreGrad.addColorStop(0.75, '#FFC857');
  coreGrad.addColorStop(1, 'rgba(255, 200, 87, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(center, center, 8, 0, Math.PI * 2);
  ctx.fill();

  // Star-like pinpoint center
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(center, center, 1.8, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

const CesiumGlobe = forwardRef<CesiumGlobeHandle, CesiumGlobeProps>(function CesiumGlobe(
  {
    markers,
    selectedMarkerId,
    onSelectMarker,
    onLocationPicked,
    isPickingLocation = false,
    autoRotate = true,
    earthScale = 1,
    earthOpacity = 1,
    onGlobeReady,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cesiumRef = useRef<any>(null);
  const isInteractingRef = useRef(false);
  const isFlyingRef = useRef(false);
  const lastInteractionTimeRef = useRef(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entitiesMapRef = useRef<Map<string, any>>(new Map());

  // Expose camera methods to parent
  useImperativeHandle(ref, () => ({
    flyToLocation: (lat: number, lng: number, height = 4500000, duration = 2.2) => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium) return;

      isFlyingRef.current = true;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-50),
          roll: 0.0,
        },
        duration,
        complete: () => {
          isFlyingRef.current = false;
          lastInteractionTimeRef.current = Date.now();
        },
        cancel: () => {
          isFlyingRef.current = false;
        },
      });
    },
    resetView: () => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium) return;

      isFlyingRef.current = true;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(10.0, 10.0, 24500000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0,
        },
        duration: 2.0,
        complete: () => {
          isFlyingRef.current = false;
          lastInteractionTimeRef.current = Date.now();
        },
      });
    },
    igniteLightEffect: (lat: number, lng: number) => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium) return;

      isFlyingRef.current = true;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, 3500000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0,
        },
        duration: 2.4,
        complete: () => {
          isFlyingRef.current = false;
          lastInteractionTimeRef.current = Date.now();
        },
      });
    },
  }));

  // Initialize Cesium Viewer with realistic satellite imagery
  useEffect(() => {
    let isCancelled = false;

    async function loadCesiumAndInit() {
      try {
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).CESIUM_BASE_URL = '/cesium';
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let Cesium = (window as any).Cesium;
        if (!Cesium) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/cesium/Cesium.js';
            script.async = true;
            script.onload = () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Cesium = (window as any).Cesium;
              resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Cesium runtime.'));
            document.head.appendChild(script);
          });
        }

        if (isCancelled || !containerRef.current || !Cesium) return;
        cesiumRef.current = Cesium;

        // Initialize Cesium Viewer with NO default base layer (we load explicit satellite layers)
        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          baseLayer: false,
          orderIndependentTranslucency: true,
          contextOptions: {
            webgl: {
              alpha: true,
              antialias: true,
              preserveDrawingBuffer: true,
            },
          },
        });

        viewerRef.current = viewer;

        const scene = viewer.scene;
        const globe = scene.globe;

        // Space and background setup
        scene.backgroundColor = Cesium.Color.fromCssColorString('#030407');
        globe.baseColor = Cesium.Color.fromCssColorString('#080D18');

        if (scene.skyBox) {
          scene.skyBox.show = false;
        }
        if (scene.moon) {
          scene.moon.show = false;
        }

        // Realistic day/night terminator and atmospheric scattering
        globe.enableLighting = true;
        globe.atmosphereLightIntensity = 10.0;
        globe.showGroundAtmosphere = true;

        if (scene.skyAtmosphere) {
          scene.skyAtmosphere.show = true;
          scene.skyAtmosphere.brightnessShift = 0.05;
          scene.skyAtmosphere.saturationShift = 0.2;
        }

        // Sun position time setting: Europe & Africa & Atlantic illuminated with dramatic terminator
        const initialDate = new Date(Date.UTC(2026, 5, 21, 13, 30, 0));
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(initialDate);
        viewer.clock.shouldAnimate = false;

        // Camera position: Earth dominates ~60-70% of viewport with ample space around
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(12.0, 12.0, 24500000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90),
            roll: 0.0,
          },
        });

        // Controller constraints
        const controller = scene.screenSpaceCameraController;
        controller.minimumZoomDistance = 2000000.0;
        controller.maximumZoomDistance = 38000000.0;
        controller.inertiaSpin = 0.9;
        controller.inertiaTranslate = 0.9;
        controller.inertiaZoom = 0.85;

        // ATTACH REAL SATELLITE IMAGERY PROVIDER
        let layerLoaded = false;

        // Tier 1: Check optional Cesium Ion Token
        if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
          try {
            Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
            const ionProvider = await Cesium.createWorldImageryAsync({
              style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
            });
            if (!viewer.isDestroyed()) {
              viewer.imageryLayers.addImageryProvider(ionProvider);
              layerLoaded = true;
            }
          } catch (e) {
            console.warn('Cesium Ion provider unavailable, using satellite tier 2:', e);
          }
        }

        // Tier 2: ArcGIS World Imagery (high-resolution satellite photography - Google Earth visual quality)
        if (!layerLoaded) {
          try {
            const arcGisProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
              'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
              { enablePickFeatures: false }
            );
            if (!viewer.isDestroyed()) {
              viewer.imageryLayers.addImageryProvider(arcGisProvider);
              layerLoaded = true;
              console.log('Attached ArcGIS World Satellite Imagery successfully.');
            }
          } catch (e) {
            console.warn('ArcGIS World Imagery error, trying local TMS:', e);
          }
        }

        // Tier 3: Local Natural Earth II TMS fallback
        if (!layerLoaded) {
          try {
            const tmsProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
              '/cesium/Assets/Textures/NaturalEarthII'
            );
            if (!viewer.isDestroyed()) {
              viewer.imageryLayers.addImageryProvider(tmsProvider);
              layerLoaded = true;
              console.log('Attached local NaturalEarthII imagery.');
            }
          } catch (e) {
            console.error('All imagery providers failed:', e);
          }
        }

        // Slow, continuous natural planetary rotation
        const onTick = () => {
          if (!viewer || viewer.isDestroyed()) return;
          const now = Date.now();
          const idleTime = now - lastInteractionTimeRef.current;

          if (
            autoRotate &&
            !isInteractingRef.current &&
            !isFlyingRef.current &&
            idleTime > 1500
          ) {
            const easeFactor = Math.min(1, (idleTime - 1500) / 1800);
            const rotationStep = 0.00045 * easeFactor;
            scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -rotationStep);
          }
        };

        viewer.clock.onTick.addEventListener(onTick);

        // Interaction handlers
        const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

        handler.setInputAction(() => {
          isInteractingRef.current = true;
          lastInteractionTimeRef.current = Date.now();
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        handler.setInputAction(() => {
          isInteractingRef.current = false;
          lastInteractionTimeRef.current = Date.now();
        }, Cesium.ScreenSpaceEventType.LEFT_UP);

        handler.setInputAction(() => {
          lastInteractionTimeRef.current = Date.now();
        }, Cesium.ScreenSpaceEventType.WHEEL);

        handler.setInputAction(() => {
          isInteractingRef.current = true;
          lastInteractionTimeRef.current = Date.now();
        }, Cesium.ScreenSpaceEventType.PINCH_START);

        handler.setInputAction(() => {
          isInteractingRef.current = false;
          lastInteractionTimeRef.current = Date.now();
        }, Cesium.ScreenSpaceEventType.PINCH_END);

        // Click handler
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler.setInputAction((movement: any) => {
          lastInteractionTimeRef.current = Date.now();

          if (isPickingLocation && onLocationPicked) {
            const cartesian = viewer.camera.pickEllipsoid(movement.position, scene.globe.ellipsoid);
            if (cartesian) {
              const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              const lat = Cesium.Math.toDegrees(cartographic.latitude);
              const lng = Cesium.Math.toDegrees(cartographic.longitude);
              onLocationPicked(Number(lat.toFixed(4)), Number(lng.toFixed(4)));
            }
            return;
          }

          const pickedObject = scene.pick(movement.position);
          if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id._markerData) {
            const marker = pickedObject.id._markerData as LightMarkerData;
            onSelectMarker(marker);

            isFlyingRef.current = true;
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(marker.lng, marker.lat, 4200000),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-48),
                roll: 0.0,
              },
              duration: 2.0,
              complete: () => {
                isFlyingRef.current = false;
              },
            });
          } else {
            onSelectMarker(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setIsReady(true);
        if (onGlobeReady) onGlobeReady();
      } catch (err: unknown) {
        console.error('Cesium globe initialization error:', err);
        const message = err instanceof Error ? err.message : 'WebGL Initialization error';
        setLoadError(message);
      }
    }

    loadCesiumAndInit();

    return () => {
      isCancelled = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying Cesium viewer:', e);
        }
        viewerRef.current = null;
      }
    };
  }, []);

  // Update light markers on globe
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !isReady) return;

    entitiesMapRef.current.forEach((entity) => {
      try {
        viewer.entities.remove(entity);
      } catch {
        // ignore
      }
    });
    entitiesMapRef.current.clear();

    const standardGlow = createGlowCanvas(false);
    const topLeaderGlow = createGlowCanvas(true);

    markers.forEach((marker) => {
      const isSelected = selectedMarkerId === marker.id;
      const isTop = !!marker.isTopContributor;

      const entity = viewer.entities.add({
        id: marker.id,
        position: Cesium.Cartesian3.fromDegrees(marker.lng, marker.lat, 1000),
        billboard: {
          image: isTop ? topLeaderGlow : standardGlow,
          scale: isSelected ? 1.3 : isTop ? 1.05 : 0.8,
          scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 2.8e7, 0.45),
          translucencyByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 3.5e7, 0.6),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entity as any)._markerData = marker;
      entitiesMapRef.current.set(marker.id, entity);
    });
  }, [markers, selectedMarkerId, isReady]);

  if (loadError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#030407] z-10 p-6 text-center">
        <div className="max-w-md p-8 rounded-2xl glass-panel border border-red-500/20">
          <h3 className="text-xl font-medium text-[#F5F7FA] mb-2">3D Engine Notice</h3>
          <p className="text-sm text-[#8993A7] mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full btn-gold text-xs uppercase tracking-widest"
          >
            Reload Engine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-all duration-1000"
      style={{
        transform: `scale(${earthScale})`,
        opacity: earthOpacity,
      }}
    >
      <div
        ref={containerRef}
        id="cesiumContainer"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
});

export default CesiumGlobe;
