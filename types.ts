
export type AppState = 'initial' | 'loading_location' | 'loading_restaurants' | 'results' | 'error';

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
