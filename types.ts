
export type AppState = 'initial' | 'loading_location' | 'loading_restaurants' | 'results' | 'error' | 'viewing_saved_places';

export interface Restaurant {
    name: string;
    description: string;
    rating?: number;
    priceRange?: string;
}

export interface GeoLocation {
    latitude: number;
    longitude: number;
}

export interface GroundingChunk {
    maps?: {
        uri: string;
        title: string;
    };
}

export interface SavedSearch {
    id: string;
    cuisine: string;
    location: GeoLocation;
    timestamp: number;
}

export interface Collection {
    id: string;
    name: string;
}

export interface SavedPlace extends Restaurant {
    id: string;
    cuisine: string;
    mapLink?: string;
    savedAt: number;
    collectionIds: string[];
}