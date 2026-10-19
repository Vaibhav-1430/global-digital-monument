'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SpaceBackground from '@/components/SpaceBackground';
import EarthCanvas from '@/components/EarthCanvas';
import AtmosphericRim from '@/components/AtmosphericRim';
import SiteHeader from '@/components/SiteHeader';
import HeroContent from '@/components/HeroContent';
import SelectedMarkerCard from '@/components/SelectedMarkerCard';
import AddYourLightFlow from '@/components/AddYourLightFlow';
import LightIgnition from '@/components/LightIgnition';
import LeaderboardOverlay from '@/components/LeaderboardOverlay';
import AboutOverlay from '@/components/AboutOverlay';
import WorldLeaderTakeover from '@/components/WorldLeaderTakeover';
import { LightMarkerData, IntroPhase, NavigationModal } from '@/types';
import { useContributions } from '@/hooks/useContributions';
import { FastForward } from 'lucide-react';

export default function EarthExperience() {
  // Opening sequence states
  const [phase, setPhase] = useState<IntroPhase>('darkness');
  const [starOpacity, setStarOpacity] = useState(0);
  const [rimOpacity, setRimOpacity] = useState(0);
  const [earthOpacity, setEarthOpacity] = useState(0);
  const [earthScale, setEarthScale] = useState(0.92);
  const [uiOpacity, setUiOpacity] = useState(0);

  // Authoritative persistent & real-time contribution state
  const {
    markers,
    currentLeader,
    totalLights,
    takeoverEvent,
    dismissTakeover,
    addConfirmedMarker,
  } = useContributions();

  // Local UI interaction state
  const [selectedMarker, setSelectedMarker] = useState<LightMarkerData | null>(null);
  const [activeModal, setActiveModal] = useState<NavigationModal>('none');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [ignitingMarker, setIgnitingMarker] = useState<LightMarkerData | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  // Skip reveal
  const skipIntro = useCallback(() => {
    setPhase('ready');
    setStarOpacity(1);
    setRimOpacity(0);
    setEarthOpacity(1);
    setEarthScale(1);
    setUiOpacity(1);
  }, []);

  // Coordinated opening sequence (3-4 seconds total)
  useEffect(() => {
    const hasVisited = typeof window !== 'undefined' && sessionStorage.getItem('visited_gdm');
    if (hasVisited) {
      skipIntro();
      return;
    }

    // Stage 1: Darkness (0 - 800ms) - only faint stars gradually appear
    const t1 = setTimeout(() => {
      setStarOpacity(0.7);
      setPhase('atmosphere');
    }, 700);

    // Stage 2: Atmospheric Reveal & Earth emergence (800ms - 2400ms)
    const t2 = setTimeout(() => {
      setRimOpacity(0.6);
      setEarthOpacity(0.5);
      setEarthScale(0.96);
    }, 1200);

    const t3 = setTimeout(() => {
      setEarthOpacity(1);
      setEarthScale(1);
      setRimOpacity(0.2);
      setPhase('reveal');
    }, 2200);

    // Stage 3 & 4: Living planet & Minimal Interface fade-in (3000ms+)
    const t4 = setTimeout(() => {
      setPhase('ready');
      setUiOpacity(1);
      setRimOpacity(0);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('visited_gdm', 'true');
      }
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [skipIntro]);

  const handleSelectMarker = (marker: LightMarkerData | null) => {
    setSelectedMarker(marker);
    setAutoRotate(!marker);
  };

  const handleFocusLeader = (leader: LightMarkerData) => {
    handleSelectMarker(leader);
  };

  const handleStartPickingOnGlobe = () => {
    setIsPickingLocation(true);
    setActiveModal('none');
  };

  const handleLocationPicked = (lat: number, lng: number) => {
    setPickedCoordinates({ lat, lng });
    setIsPickingLocation(false);
    setActiveModal('contribute');
  };

  const handleConfirmContribution = (newMarker: LightMarkerData) => {
    addConfirmedMarker(newMarker);
    setSelectedMarker(newMarker);
    setIgnitingMarker(newMarker);
  };

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#030407] select-none font-sans"
      onClick={() => {
        // Allow clicking anywhere to skip intro during darkness/atmosphere phase
        if (phase !== 'ready') skipIntro();
      }}
    >
      {/* Stars canvas */}
      <SpaceBackground starsVisible={starOpacity > 0} starOpacity={starOpacity} />

      {/* Atmospheric Rim during early emergence */}
      <AtmosphericRim opacity={rimOpacity} scale={earthScale} />

      {/* Real 3D Earth GLB Canvas */}
      <EarthCanvas
        markers={markers}
        selectedMarkerId={selectedMarker?.id || null}
        onSelectMarker={handleSelectMarker}
        onLocationPicked={handleLocationPicked}
        isPickingLocation={isPickingLocation}
        autoRotate={autoRotate && !isPickingLocation && !selectedMarker && activeModal === 'none'}
        earthScale={earthScale}
        earthOpacity={earthOpacity}
      />

      {/* Picking HUD notification */}
      {isPickingLocation && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-full glass-panel-gold border border-[#FFC857] flex items-center gap-3 animate-bounce shadow-2xl pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#FFC857] animate-ping" />
          <span className="text-xs font-mono tracking-wider text-[#FFC857] font-medium uppercase">
            Click anywhere on Earth to select location
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPickingLocation(false);
              setActiveModal('contribute');
            }}
            className="text-xs text-[#8993A7] hover:text-[#F5F7FA] underline ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Skip button for intro */}
      {phase !== 'ready' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            skipIntro();
          }}
          className="fixed bottom-6 right-6 z-40 px-3.5 py-1.5 rounded-full glass-panel text-[10px] font-mono tracking-widest text-[#8993A7] hover:text-[#F5F7FA] border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>SKIP REVEAL</span>
          <FastForward className="w-3 h-3 text-[#FFC857]" />
        </button>
      )}

      {/* Minimal Header with dynamic World Leader spotlight */}
      <SiteHeader
        opacity={uiOpacity}
        onOpenLeaderboard={() => setActiveModal('leaderboard')}
        onOpenAbout={() => setActiveModal('about')}
        onOpenLeader={() => currentLeader && handleFocusLeader(currentLeader)}
        featuredLeader={currentLeader || undefined}
      />

      {/* Minimal Hero Copy and Single Primary CTA */}
      {!selectedMarker && (
        <HeroContent
          opacity={uiOpacity}
          onAddLightClick={() => setActiveModal('contribute')}
          totalLights={totalLights}
        />
      )}

      {/* Selected Marker Card (only appears on interaction) */}
      {selectedMarker && !ignitingMarker && (
        <SelectedMarkerCard
          marker={selectedMarker}
          onClose={() => {
            setSelectedMarker(null);
            setAutoRotate(true);
          }}
          onFlyTo={() => {
            handleFocusLeader(selectedMarker);
          }}
        />
      )}

      {/* Contribution Modal Flow */}
      <AddYourLightFlow
        isOpen={activeModal === 'contribute'}
        onClose={() => setActiveModal('none')}
        onStartPickingOnGlobe={handleStartPickingOnGlobe}
        pickedCoordinates={pickedCoordinates}
        onConfirmContribution={handleConfirmContribution}
      />

      {/* Light Ignition Cinematic Animation */}
      <LightIgnition
        marker={ignitingMarker}
        isActive={!!ignitingMarker}
        onDismiss={() => setIgnitingMarker(null)}
      />

      {/* World Leader #1 Takeover Celebration Banner */}
      {takeoverEvent && (
        <WorldLeaderTakeover
          newLeader={takeoverEvent.newLeader}
          previousLeader={takeoverEvent.previousLeader}
          onDismiss={dismissTakeover}
          onFlyToLeader={(leader) => {
            handleSelectMarker(leader);
            dismissTakeover();
          }}
        />
      )}

      {/* Leaderboard Overlay */}
      <LeaderboardOverlay
        isOpen={activeModal === 'leaderboard'}
        onClose={() => setActiveModal('none')}
        markers={markers}
        onSelectAndFlyTo={(m) => {
          setActiveModal('none');
          handleSelectMarker(m);
        }}
      />

      {/* About Overlay */}
      <AboutOverlay
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal('none')}
      />
    </main>
  );
}
