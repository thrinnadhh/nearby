/**
 * Profile types — user account information, saved addresses, preferences
 */

export interface Profile {
  id: string;
  phone: string;
  role: 'customer';
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  total_orders: number;
  avg_rating: number | null;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  is_default: boolean;
  created_at: string;
}

export interface ProfileStore {
  profile: Profile | null;
  savedAddresses: SavedAddress[];
  loading: boolean;
  error: Error | null;
  _hasHydrated: boolean;

  // Actions
  fetchProfile: (token: string) => Promise<void>;
  fetchSavedAddresses: (token: string) => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSavedAddresses: (addresses: SavedAddress[]) => void;
}

export interface UpdateProfilePayload {
  name?: string;
  avatar_url?: string;
}
