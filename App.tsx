
import React, { useState, useCallback, FC, useMemo, useEffect, useRef } from 'react';
import { findRestaurants, generateInvitation } from './services/geminiService';
import type { Restaurant, AppState, GroundingChunk, SavedSearch, GeoLocation, SavedPlace, Collection } from './types';
import { RestaurantCard } from './components/RestaurantCard';
import { LoadingSpinner, LocationPinIcon, SearchIcon, ShareIcon, SparklesIcon, XCircleIcon, BookmarkIcon, TrashIcon, BookmarkFilledIcon, FolderPlusIcon, ChevronDownIcon, AlertTriangleIcon } from './components/Icons';

const ManagePlaceDropdown: FC<{
    place: SavedPlace;
    collections: Collection[];
    onAdd: (placeId: string, collectionId: string) => void;
    onRemove: (placeId: string, collectionId: string) => void;
}> = ({ place, collections, onAdd, onRemove }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const availableCollections = collections.filter(c => !place.collectionIds.includes(c.id));
    const currentCollections = collections.filter(c => place.collectionIds.includes(c.id));

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2">
                Manage <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && (
                <div className="absolute bottom-full mb-2 w-56 bg-white rounded-md shadow-lg border z-10 text-sm">
                    {availableCollections.length > 0 && (
                        <div>
                            <span className="block px-3 py-2 text-xs text-gray-400 font-semibold">Add to...</span>
                            {availableCollections.map(c => (
                                <button key={c.id} onClick={() => { onAdd(place.id, c.id); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}
                    {currentCollections.length > 0 && (
                         <div>
                             <span className="block px-3 py-2 text-xs text-gray-400 font-semibold">Remove from...</span>
                             {currentCollections.map(c => (
                                 <button key={c.id} onClick={() => { onRemove(place.id, c.id); setIsOpen(false); }} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
                                     {c.name}
                                 </button>
                             ))}
                         </div>
                    )}
                </div>
            )}
        </div>
    );
};

const App: FC = () => {
  const [cuisine, setCuisine] = useState<string>('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [invitation, setInvitation] = useState<string>('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [appState, setAppState] = useState<AppState>('initial');
  const [error, setError] = useState<string | null>(null);
  
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [activePriceFilters, setActivePriceFilters] = useState<string[]>([]);
  const [activeRatingFilter, setActiveRatingFilter] = useState<number>(0);
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    try {
        const storedSearches = localStorage.getItem('flavorFinder_savedSearches');
        if (storedSearches) setSavedSearches(JSON.parse(storedSearches));
        
        const storedPlaces = localStorage.getItem('flavorFinder_savedPlaces');
        if (storedPlaces) setSavedPlaces(JSON.parse(storedPlaces));

        const storedCollections = localStorage.getItem('flavorFinder_collections');
        if (storedCollections) setCollections(JSON.parse(storedCollections));
    } catch (e) {
        console.error("Failed to parse data from localStorage", e);
    }
  }, []);

  const executeSearch = useCallback(async (searchCuisine: string, searchLocation: GeoLocation) => {
    setAppState('loading_restaurants');
    setCurrentLocation(searchLocation);
    setError(null);
    setRestaurants([]);
    setGroundingChunks([]);
    setSelectedRestaurant(null);
    setInvitation('');
    setActivePriceFilters([]);
    setActiveRatingFilter(0);

    try {
      const result = await findRestaurants(searchCuisine, searchLocation);
      if (result.restaurants && result.restaurants.length > 0) {
        setRestaurants(result.restaurants);
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
  }, []);

  const handleFindRestaurants = useCallback(() => {
    if (!cuisine.trim()) {
      setError('Please enter a cuisine.');
      return;
    }
    setAppState('loading_location');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        executeSearch(cuisine, { latitude, longitude });
      },
      (geoError) => {
        console.error(geoError);
        setError('Could not get your location. Please enable location services in your browser.');
        setAppState('error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [cuisine, executeSearch]);
  
  const handleRunSavedSearch = (search: SavedSearch) => {
    setCuisine(search.cuisine);
    executeSearch(search.cuisine, search.location);
  };

  const handleGenerateInvitation = useCallback(async (restaurant: Restaurant, inviteCuisine: string) => {
    setSelectedRestaurant(restaurant);
    setInvitation('Generating invitation...');
    try {
        const message = await generateInvitation(restaurant.name, inviteCuisine);
        setInvitation(message);
    } catch (err) {
        console.error(err);
        setInvitation('Could not generate invitation. Please try again.');
    }
  }, []);

  const handleShare = async () => {
    if (navigator.share && invitation) {
        try {
            await navigator.share({ title: `Join me for ${cuisine}!`, text: invitation });
        } catch (error) {
            console.error('Error sharing:', error);
            copyToClipboard();
        }
    } else {
        copyToClipboard();
    }
  };
  
  const copyToClipboard = () => {
    if(!invitation) return;
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
    setCurrentLocation(null);
    setActivePriceFilters([]);
    setActiveRatingFilter(0);
  };
  
  const handleSaveSearch = () => {
    if (!cuisine || !currentLocation) return;
    const newSearch: SavedSearch = {
        id: crypto.randomUUID(),
        cuisine,
        location: currentLocation,
        timestamp: Date.now(),
    };
    const isDuplicate = savedSearches.some(s => s.cuisine.toLowerCase() === newSearch.cuisine.toLowerCase() && s.location.latitude === newSearch.location.latitude && s.location.longitude === newSearch.location.longitude);
    if (isDuplicate) return;

    setSavedSearches(currentSearches => {
        const updatedSearches = [newSearch, ...currentSearches].slice(0, 10);
        localStorage.setItem('flavorFinder_savedSearches', JSON.stringify(updatedSearches));
        return updatedSearches;
    });
  };
  
  const handleDeleteSearch = (idToDelete: string) => {
    setSavedSearches(currentSearches => {
        const updatedSearches = currentSearches.filter(s => s.id !== idToDelete);
        localStorage.setItem('flavorFinder_savedSearches', JSON.stringify(updatedSearches));
        return updatedSearches;
    });
  };

  const handleSavePlace = (restaurant: Restaurant, mapLink?: string) => {
    if (!cuisine) return;
    const isAlreadySaved = savedPlaces.some(p => p.name.toLowerCase() === restaurant.name.toLowerCase());
    if (isAlreadySaved) return;

    const newPlace: SavedPlace = {
        ...restaurant,
        id: crypto.randomUUID(),
        cuisine,
        mapLink,
        savedAt: Date.now(),
        collectionIds: [],
    };
    setSavedPlaces(currentPlaces => {
        const updatedPlaces = [newPlace, ...currentPlaces];
        localStorage.setItem('flavorFinder_savedPlaces', JSON.stringify(updatedPlaces));
        return updatedPlaces;
    });
  };
  
  const handleDeletePlace = (idToDelete: string) => {
    if(!window.confirm("Are you sure you want to permanently delete this place?")) return;
    setSavedPlaces(currentPlaces => {
        const updatedPlaces = currentPlaces.filter(p => p.id !== idToDelete);
        localStorage.setItem('flavorFinder_savedPlaces', JSON.stringify(updatedPlaces));
        return updatedPlaces;
    });
  };

  const isPlaceSaved = (restaurantName: string) => {
      return savedPlaces.some(p => p.name.toLowerCase() === restaurantName.toLowerCase());
  }

  const handleCreateCollection = () => {
    if (!newCollectionName.trim() || collections.some(c => c.name.toLowerCase() === newCollectionName.trim().toLowerCase())) {
        alert("Collection name cannot be empty or a duplicate.");
        return;
    }
    const newCollection: Collection = { id: crypto.randomUUID(), name: newCollectionName.trim() };
    setCollections(currentCollections => {
        const updatedCollections = [...currentCollections, newCollection];
        localStorage.setItem('flavorFinder_collections', JSON.stringify(updatedCollections));
        return updatedCollections;
    });
    setNewCollectionName('');
    setShowNewCollectionInput(false);
  }

  const handleDeleteCollection = (idToDelete: string) => {
      if (!window.confirm("Are you sure you want to delete this collection? Places inside won't be deleted.")) return;
      
      setCollections(currentCollections => {
          const updatedCollections = currentCollections.filter(c => c.id !== idToDelete);
          localStorage.setItem('flavorFinder_collections', JSON.stringify(updatedCollections));
          return updatedCollections;
      });

      setSavedPlaces(currentPlaces => {
          const updatedPlaces = currentPlaces.map(p => ({
              ...p,
              collectionIds: p.collectionIds.filter(cid => cid !== idToDelete)
          }));
          localStorage.setItem('flavorFinder_savedPlaces', JSON.stringify(updatedPlaces));
          return updatedPlaces;
      });
  };

  const handleAddPlaceToCollection = (placeId: string, collectionId: string) => {
      setSavedPlaces(currentPlaces => {
          const updatedPlaces = currentPlaces.map(p => 
              p.id === placeId ? { ...p, collectionIds: [...p.collectionIds, collectionId] } : p
          );
          localStorage.setItem('flavorFinder_savedPlaces', JSON.stringify(updatedPlaces));
          return updatedPlaces;
      });
  };

  const handleRemovePlaceFromCollection = (placeId: string, collectionId: string) => {
      setSavedPlaces(currentPlaces => {
          const updatedPlaces = currentPlaces.map(p => 
              p.id === placeId ? { ...p, collectionIds: p.collectionIds.filter(cid => cid !== collectionId) } : p
          );
          localStorage.setItem('flavorFinder_savedPlaces', JSON.stringify(updatedPlaces));
          return updatedPlaces;
      });
  };

  const handleClearAllData = () => {
    if (window.confirm("Are you sure you want to delete ALL your saved places and collections? This action cannot be undone.")) {
        setSavedPlaces([]);
        setCollections([]);
        setSavedSearches([]);
        localStorage.removeItem('flavorFinder_savedPlaces');
        localStorage.removeItem('flavorFinder_collections');
        localStorage.removeItem('flavorFinder_savedSearches');
    }
  };

  const togglePriceFilter = (price: string) => {
    setActivePriceFilters(prev => prev.includes(price) ? prev.filter(p => p !== price) : [...prev, price]);
  };
  
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
        const priceMatch = activePriceFilters.length === 0 || (r.priceRange && activePriceFilters.includes(r.priceRange));
        const ratingMatch = activeRatingFilter === 0 || (r.rating && r.rating >= activeRatingFilter);
        return priceMatch && ratingMatch;
    });
  }, [restaurants, activePriceFilters, activeRatingFilter]);

  const loadingMessage = useMemo(() => {
    if (appState === 'loading_location') return 'Getting your location...';
    if (appState === 'loading_restaurants') return `Finding the best ${cuisine} places near you...`;
    return 'Loading...';
  }, [appState, cuisine]);
  
  const isSearchSaved = useMemo(() => {
    if (!cuisine || !currentLocation) return false;
    return savedSearches.some(s => s.cuisine.toLowerCase() === cuisine.toLowerCase() && s.location.latitude === currentLocation.latitude && s.location.longitude === currentLocation.longitude);
  }, [savedSearches, cuisine, currentLocation]);

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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-3xl font-bold text-gray-800 text-center sm:text-left">Top <span className="text-blue-500">{cuisine}</span> spots near you</h2>
              <div className="flex items-center gap-3">
                <button onClick={handleSaveSearch} disabled={isSearchSaved} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors duration-300 border border-gray-300 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <BookmarkIcon /> {isSearchSaved ? 'Saved' : 'Save Search'}
                </button>
                <button onClick={resetSearch} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-5 rounded-lg transition-colors duration-300 border border-gray-300 shadow-sm">New Search</button>
              </div>
            </div>
            
            <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center sm:justify-start">
                    <h4 className="font-semibold text-gray-700">Filter by:</h4>
                    <div className="flex items-center gap-2" role="group" aria-label="Price filter">
                        {['$', '$$', '$$$'].map(price => (
                            <button key={price} onClick={() => togglePriceFilter(price)} aria-pressed={activePriceFilters.includes(price)} className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${activePriceFilters.includes(price) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-300'}`}>
                                {price}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center">
                        <label htmlFor="rating-filter" className="text-sm font-medium text-gray-600 mr-2">Rating:</label>
                        <select id="rating-filter" value={activeRatingFilter} onChange={e => setActiveRatingFilter(Number(e.target.value))} className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2">
                            <option value="0">Any</option>
                            <option value="4.5">4.5+ Stars</option>
                            <option value="4">4+ Stars</option>
                            <option value="3.5">3.5+ Stars</option>
                            <option value="3">3+ Stars</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredRestaurants.length > 0 ? filteredRestaurants.map((restaurant, index) => {
                    const originalIndex = restaurants.findIndex(r => r.name === restaurant.name && r.description === restaurant.description);
                    const mapLink = groundingChunks[originalIndex]?.maps?.uri;
                    return (
                        <RestaurantCard
                            key={`${restaurant.name}-${index}`}
                            restaurant={restaurant}
                            mapLink={mapLink}
                            onInvite={() => handleGenerateInvitation(restaurant, cuisine)}
                            onSave={() => handleSavePlace(restaurant, mapLink)}
                            isSaved={isPlaceSaved(restaurant.name)}
                            style={{ animationDelay: `${index * 100}ms` }}
                            className="animate-fade-in"
                        />
                    )
                }) : (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm border">
                        <p className="text-gray-600">No restaurants match your filters.</p>
                    </div>
                )}
            </div>
            
            {selectedRestaurant && (
                <div className="mt-12 bg-white p-6 rounded-2xl shadow-lg animate-fade-in border border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Invitation for <span className="text-blue-500">{selectedRestaurant.name}</span></h3>
                    <div className="bg-gray-100 p-4 rounded-lg text-gray-700 whitespace-pre-wrap min-h-[120px] border border-gray-200">
                        {invitation === 'Generating invitation...' ? <div className="flex items-center justify-center h-full"><LoadingSpinner/></div> : invitation}
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                        <button onClick={handleShare} disabled={invitation === 'Generating invitation...'} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <ShareIcon /> Share
                        </button>
                        <button onClick={() => handleGenerateInvitation(selectedRestaurant, cuisine)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 shadow-sm">
                           <SparklesIcon /> Regenerate
                        </button>
                    </div>
                </div>
            )}
          </div>
        );
       case 'viewing_saved_places':
        const uncategorizedPlaces = savedPlaces.filter(p => p.collectionIds.length === 0);
        return (
          <div className="w-full max-w-6xl mx-auto px-4 md:px-0 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-3xl font-bold text-gray-800">My <span className="text-blue-500">Collections</span></h2>
              <button onClick={resetSearch} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-5 rounded-lg transition-colors duration-300 border border-gray-300 shadow-sm">Back to Search</button>
            </div>

            <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                {!showNewCollectionInput ? (
                    <button onClick={() => setShowNewCollectionInput(true)} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-3 px-5 rounded-lg transition-colors duration-300 border border-dashed border-blue-300 flex items-center justify-center gap-2">
                        <FolderPlusIcon/> Create New Collection
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <input type="text" value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} placeholder="e.g. Date Night Spots" className="flex-grow pl-4 pr-4 py-2 bg-white text-gray-900 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all duration-300" />
                        <button onClick={handleCreateCollection} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Create</button>
                        <button onClick={() => {setShowNewCollectionInput(false); setNewCollectionName('');}} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                    </div>
                )}
            </div>

            {savedPlaces.length === 0 && collections.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                    <BookmarkFilledIcon className="w-16 h-16 text-gray-300 mx-auto" />
                    <p className="mt-4 text-gray-600">You haven't saved any places yet.</p>
                 </div>
            ) : (
                <div className="space-y-12">
                    {collections.map(collection => {
                        const placesInCollection = savedPlaces.filter(p => p.collectionIds.includes(collection.id));
                        return (
                            <div key={collection.id}>
                                <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-gray-200">
                                    <h3 className="text-2xl font-bold text-gray-800">{collection.name}</h3>
                                    <button onClick={() => handleDeleteCollection(collection.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-100/50 p-1.5 rounded-full transition-colors"><TrashIcon/></button>
                                </div>
                                {placesInCollection.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {placesInCollection.map((place, index) => (
                                            <RestaurantCard
                                                key={place.id} restaurant={place} mapLink={place.mapLink}
                                                onInvite={() => handleGenerateInvitation(place, place.cuisine)}
                                                onDelete={() => handleDeletePlace(place.id)}
                                                managementControls={<ManagePlaceDropdown place={place} collections={collections} onAdd={handleAddPlaceToCollection} onRemove={handleRemovePlaceFromCollection} />}
                                                style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in"
                                            />
                                        ))}
                                    </div>
                                ) : <p className="text-gray-500 italic">No places in this collection yet.</p>}
                            </div>
                        )
                    })}
                    {uncategorizedPlaces.length > 0 && (
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">Uncategorized</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {uncategorizedPlaces.map((place, index) => (
                                    <RestaurantCard
                                        key={place.id} restaurant={place} mapLink={place.mapLink}
                                        onInvite={() => handleGenerateInvitation(place, place.cuisine)}
                                        onDelete={() => handleDeletePlace(place.id)}
                                        managementControls={<ManagePlaceDropdown place={place} collections={collections} onAdd={handleAddPlaceToCollection} onRemove={handleRemovePlaceFromCollection} />}
                                        style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {(savedPlaces.length > 0 || collections.length > 0 || savedSearches.length > 0) && (
                <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-200 text-center">
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">Danger Zone</h4>
                    <p className="text-sm text-gray-500 mb-4">Permanently delete all of your saved data.</p>
                    <button
                        onClick={handleClearAllData}
                        className="bg-white hover:bg-red-50 text-red-600 font-bold py-2 px-5 rounded-lg transition-colors duration-300 border-2 border-red-200 shadow-sm inline-flex items-center gap-2"
                    >
                        <AlertTriangleIcon className="w-5 h-5"/> Clear All Data
                    </button>
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
                <button onClick={resetSearch} className="mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-transform duration-200 hover:scale-105 shadow-sm">
                    Try Again
                </button>
            </div>
        );
      case 'initial':
      default:
        return (
          <div className="w-full max-w-lg text-center">
            <LocationPinIcon className="w-20 h-20 mx-auto text-blue-500" />
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-4">Flavor Finder</h1>
            <p className="text-lg md:text-xl text-gray-600 mt-2 mb-8">What are you craving today?</p>
            <div className="relative">
              <input type="text" value={cuisine} onChange={(e) => setCuisine(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleFindRestaurants()} placeholder="e.g., Italian, Sushi, Tacos..." className="w-full pl-5 pr-16 py-4 bg-white text-gray-900 rounded-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 text-lg placeholder-gray-500 shadow-sm" />
              <button onClick={handleFindRestaurants} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-transform duration-200 hover:scale-110 shadow-md" aria-label="Find Restaurants">
                <SearchIcon />
              </button>
            </div>
            <div className="mt-10 w-full animate-fade-in text-left">
                {savedPlaces.length > 0 && (
                    <div className="text-center mb-6">
                         <button onClick={() => setAppState('viewing_saved_places')} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-5 rounded-lg transition-colors duration-300 border border-gray-300 shadow-sm flex items-center gap-2 mx-auto">
                            <BookmarkFilledIcon /> My Collections
                        </button>
                    </div>
                )}
                {savedSearches.length > 0 && (
                    <>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">Saved Searches</h3>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {savedSearches.map(search => (
                                <div key={search.id} className="flex items-center bg-white border border-gray-200 rounded-full shadow-sm group">
                                    <button onClick={() => handleRunSavedSearch(search)} className="py-2 pl-4 pr-3 text-gray-800 hover:bg-gray-100 rounded-l-full transition-colors duration-200 font-medium">
                                        {search.cuisine}
                                    </button>
                                    <button onClick={() => handleDeleteSearch(search.id)} aria-label={`Delete saved search for ${search.cuisine}`} className="p-2 mr-1 text-gray-400 hover:text-red-500 hover:bg-red-100/50 rounded-full transition-colors duration-200">
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 flex flex-col items-center justify-center p-4 selection:bg-blue-200">
      <main className="w-full flex-grow flex items-center justify-center py-8">
        {renderContent()}
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;
