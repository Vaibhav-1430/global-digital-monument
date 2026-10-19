export interface LightMarkerData {
  id: string;
  lat: number;
  lng: number;
  elevation?: number;
  name: string;
  isAnonymous: boolean;
  amount: number;
  message?: string;
  city?: string;
  country: string;
  timestamp: string;
  isTopContributor?: boolean;
  rank?: number;
  photoUrl?: string;
  isDemo?: boolean;
  isApproximate?: boolean;
  createdAt?: number;
}

export interface TakeoverEvent {
  newLeader: LightMarkerData;
  previousLeader?: LightMarkerData | null;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  amount: number;
  city?: string;
  country: string;
  coordinates: [number, number]; // [lat, lng]
  message?: string;
  timestamp: string;
  isAnonymous?: boolean;
}

export type IntroPhase = 'darkness' | 'atmosphere' | 'reveal' | 'ready';
export type NavigationModal = 'none' | 'leaderboard' | 'about' | 'contribute' | 'selected_marker';
