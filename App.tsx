import React, { useState, useCallback, FC, useMemo } from 'react';
import { findRestaurants, generateInvitation } from './services/geminiService';
import type { Restaurant, AppState, GroundingChunk } from './types';
import { RestaurantCard } from './components/RestaurantCard';
import { LoadingSpinner, LocationPinIcon, SearchIcon, ShareIcon, SparklesIcon, XCircleIcon } from './components/Icons';

const App: FC = () => {
  const [cuisine, setCuisine] = useState<string>('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [invitation, setInvitation] = useState<string>('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [appState, setAppState] = useState<AppState>('initial');
  const [error, setError] = useState<string | null>(null);

  const handleFindRestaurants = useCallback(async () => {
    if (!cuisine.trim()) {
      setError('Please enter a cuisine.');
      return;
    }
    setAppState('loading_location');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setAppState('loading_restaurants');
        const { latitude, longitude } = position.coords;
        try {
          const result = await findRestaurants(cuisine, { latitude, longitude });
          if (result.text) {
             // FIX: Add explicit return type to map function to help TypeScript inference for the type predicate in the filter function.
             const parsedRestaurants: Restaurant[] = result.text.split('\n\n').map((block): Restaurant | null => {
                const lines = block.trim().split('\n');
                if (lines.length < 2) return null;

                const name = lines[0]?.replace(/\*\*/g, '').trim() || 'Unknown Restaurant';
                
                let rating: number | undefined;
                let priceRange: string | undefined;
                let lineIndex = 1;

                if (lines[lineIndex]?.toLowerCase().startsWith('rating:')) {
                    const ratingValue = parseFloat(lines[lineIndex].split(':')[1]?.trim());
                    if (!isNaN(ratingValue)) rating = ratingValue;
                    lineIndex++;
                }

                if (lines[lineIndex]?.toLowerCase().startsWith('price:')) {
                    priceRange = lines[lineIndex].split(':')[1]?.trim();
                    lineIndex++;
                }

                const description = lines.slice(lineIndex).join(' ').trim();

                return { name, rating, priceRange, description };
            }).filter((r): r is Restaurant => r !== null && !!r.description);
            
            setRestaurants(parsedRestaurants);
            setGroundingChunks(result.groundingChunks || []);
            setAppState('results');
          } else {
             setError('Could not find any restaurants. Try a different cuisine.');
             setAppState('error');
          }
        } catch (err) {
          console.error(err);
          setError('Failed to fetch restaurant data. Please check your connection or API key and try again.');
          setAppState('error');
        }
      },
      (geoError) => {
        console.error(geoError);
        setError('Could not get your location. Please enable location services in your browser.');
        setAppState('error');
      },
      { timeout: 10000 }
    );
  }, [cuisine]);

  const handleGenerateInvitation = useCallback(async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setInvitation('Generating invitation...');
    try {
        const message = await generateInvitation(restaurant.name, cuisine);
        setInvitation(message);
    } catch (err) {
        console.error(err);
        setInvitation('Could not generate invitation. Please try again.');
    }
  }, [cuisine]);

  const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Join me for ${cuisine}!`,
                text: invitation,
            });
        } catch (error) {
            console.error('Error sharing:', error);
            copyToClipboard();
        }
    } else {
        copyToClipboard();
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(invitation).then(() => {
        alert('Invitation copied to clipboard!');
    }, (err) => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy invitation.');
    });
  }

  const resetSearch = () => {
    setAppState('initial');
    setCuisine('');
    setRestaurants([]);
    setGroundingChunks([]);
    setError(null);
    setInvitation('');
    setSelectedRestaurant(null);
  };

  const loadingMessage = useMemo(() => {
    if (appState === 'loading_location') return 'Getting your location...';
    if (appState === 'loading_restaurants') return `Finding the best ${cuisine} places near you...`;
    return 'Loading...';
  }, [appState, cuisine]);

  const renderContent = () => {
    switch (appState) {
      case 'loading_location':
      case 'loading_restaurants':
        return (
          <div className="text-center p-8">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-gray-600">{loadingMessage}</p>
          </div>
        );
      case 'results':
        return (
          <div className="w-full max-w-6xl mx-auto px-4 md:px-0 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <h2 className="text-3xl font-bold text-gray-800 text-center sm:text-left">Top <span className="text-orange-500">{cuisine}</span> spots near you</h2>
              <button onClick={resetSearch} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-5 rounded-lg transition-colors duration-300 border border-gray-300 shadow-sm">New Search</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {restaurants.map((restaurant, index) => (
                    <RestaurantCard
                        key={index}
                        restaurant={restaurant}
                        mapLink={groundingChunks[index]?.maps?.uri}
                        onInvite={() => handleGenerateInvitation(restaurant)}
                        style={{ animationDelay: `${index * 100}ms` }}
                        className="animate-fade-in"
                    />
                ))}
            </div>
            {selectedRestaurant && (
                <div className="mt-12 bg-white p-6 rounded-2xl shadow-lg animate-fade-in border border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Invitation for <span className="text-orange-500">{selectedRestaurant.name}</span></h3>
                    <div className="bg-gray-100 p-4 rounded-lg text-gray-700 whitespace-pre-wrap min-h-[120px] border border-gray-200">
                        {invitation}
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                        <button onClick={handleShare} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 shadow-sm">
                            <ShareIcon /> Share
                        </button>
                        <button onClick={() => handleGenerateInvitation(selectedRestaurant)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 shadow-sm">
                           <SparklesIcon /> Regenerate
                        </button>
                    </div>
                </div>
            )}
          </div>
        );
      case 'error':
        return (
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-200">
                <XCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
                <h2 className="mt-4 text-2xl font-bold text-gray-800">Oops! Something went wrong.</h2>
                <p className="mt-2 text-red-600">{error}</p>
                <button
                    onClick={resetSearch}
                    className="mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg transition-transform duration-200 hover:scale-105 shadow-sm"
                >
                    Try Again
                </button>
            </div>
        );
      case 'initial':
      default:
        return (
          <div className="w-full max-w-lg text-center">
            <LocationPinIcon className="w-20 h-20 mx-auto text-orange-500" />
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-4">Flavor Finder</h1>
            <p className="text-lg md:text-xl text-gray-600 mt-2 mb-8">What are you craving today?</p>
            <div className="relative">
              <input
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFindRestaurants()}
                placeholder="e.g., Italian, Sushi, Tacos..."
                className="w-full pl-5 pr-16 py-4 bg-white text-gray-900 rounded-full border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 transition-all duration-300 text-lg placeholder-gray-500 shadow-sm"
              />
              <button
                onClick={handleFindRestaurants}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-orange-500 hover:bg-orange-600 rounded-full text-white transition-transform duration-200 hover:scale-110 shadow-md"
                aria-label="Find Restaurants"
              >
                <SearchIcon />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 flex flex-col items-center justify-center p-4 selection:bg-orange-200">
      <main className="w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;