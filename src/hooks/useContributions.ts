'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LightMarkerData, TakeoverEvent } from '@/types';
import { rankContributors, getWorldLeader } from '@/utils/ranking';
import { INITIAL_LIGHT_MARKERS, DEMO_GLOBAL_METRICS } from '@/data/demoData';

interface UseContributionsResult {
  markers: LightMarkerData[];
  currentLeader: LightMarkerData | null;
  totalLights: number;
  isLoading: boolean;
  takeoverEvent: TakeoverEvent | null;
  dismissTakeover: () => void;
  addConfirmedMarker: (marker: LightMarkerData) => void;
  refreshContributions: () => Promise<void>;
}

export function useContributions(): UseContributionsResult {
  const [markers, setMarkers] = useState<LightMarkerData[]>(() =>
    rankContributors(INITIAL_LIGHT_MARKERS)
  );
  const [totalLights, setTotalLights] = useState(DEMO_GLOBAL_METRICS.totalLights);
  const [isLoading, setIsLoading] = useState(false);
  const [takeoverEvent, setTakeoverEvent] = useState<TakeoverEvent | null>(null);

  const prevLeaderIdRef = useRef<string | null>(INITIAL_LIGHT_MARKERS[0]?.id || null);
  const knownMarkerIdsRef = useRef<Set<string>>(
    new Set(INITIAL_LIGHT_MARKERS.map((m) => m.id))
  );

  // Authoritative current world leader
  const currentLeader = useMemo(() => getWorldLeader(markers), [markers]);

  // Method to insert a confirmed marker with deduplication and takeover detection
  const addConfirmedMarker = useCallback((newMarker: LightMarkerData) => {
    if (!newMarker || !newMarker.id) return;

    // Deduplication check: ignore if already known
    if (knownMarkerIdsRef.current.has(newMarker.id)) {
      return;
    }

    knownMarkerIdsRef.current.add(newMarker.id);

    setMarkers((prev) => {
      const updatedRaw = [newMarker, ...prev];
      const ranked = rankContributors(updatedRaw);

      // Check if #1 World Leader genuinely changed
      const newTop = ranked[0];
      const previousLeaderId = prevLeaderIdRef.current;

      if (newTop && previousLeaderId && newTop.id !== previousLeaderId) {
        const prevLeader = prev.find((m) => m.id === previousLeaderId) || null;
        setTakeoverEvent({
          newLeader: newTop,
          previousLeader: prevLeader,
        });
        prevLeaderIdRef.current = newTop.id;
      }

      return ranked;
    });

    setTotalLights((prev) => prev + 1);
  }, []);

  const dismissTakeover = useCallback(() => {
    setTakeoverEvent(null);
  }, []);

  // Fetch confirmed public contributions from backend API
  const refreshContributions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/contributions');
      if (!res.ok) return;

      const data = await res.json();
      if (data.success && Array.isArray(data.contributions) && data.contributions.length > 0) {
        const ranked = rankContributors(data.contributions);
        setMarkers(ranked);
        data.contributions.forEach((m: LightMarkerData) => knownMarkerIdsRef.current.add(m.id));
        if (ranked[0]) {
          prevLeaderIdRef.current = ranked[0].id;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch contributions from backend API, using cached state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and Realtime Server-Sent Events subscription
  useEffect(() => {
    // 1. Initial fetch from API
    refreshContributions();

    // 2. Real-time subscription via Server-Sent Events
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');

      eventSource.addEventListener('new_light', (event) => {
        try {
          const newMarker: LightMarkerData = JSON.parse(event.data);
          addConfirmedMarker(newMarker);
        } catch (err) {
          console.error('Error parsing real-time new_light payload:', err);
        }
      });

      eventSource.onerror = () => {
        // Silent recovery: connection retries automatically
      };
    } catch {
      // EventSource unavailable in non-browser environment
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [refreshContributions, addConfirmedMarker]);

  return {
    markers,
    currentLeader,
    totalLights,
    isLoading,
    takeoverEvent,
    dismissTakeover,
    addConfirmedMarker,
    refreshContributions,
  };
}
