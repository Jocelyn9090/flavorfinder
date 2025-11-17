
import React, { FC } from 'react';
import type { Restaurant } from '../types';
import { MapPinIcon, MessageSquareIcon, StarIcon, BookmarkIcon, BookmarkFilledIcon, TrashIcon } from './Icons';

interface RestaurantCardProps {
    restaurant: Restaurant;
    mapLink?: string;
    onInvite: () => void;
    className?: string;
    style?: React.CSSProperties;
    onSave?: () => void;
    isSaved?: boolean;
    onDelete?: () => void;
    managementControls?: React.ReactNode;
}

const renderStars = (rating?: number) => {
    if (rating === undefined) return null;
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;

    return (
        <div className="flex items-center" aria-label={`Rating: ${rating} out of 5 stars`}>
            {[...Array(fullStars)].map((_, i) => <StarIcon key={`full-${i}`} className="w-5 h-5 text-yellow-400" />)}
            {[...Array(emptyStars)].map((_, i) => <StarIcon key={`empty-${i}`} className="w-5 h-5 text-gray-300" />)}
            <span className="ml-2 text-sm font-medium text-gray-500">{rating.toFixed(1)}</span>
        </div>
    );
};

export const RestaurantCard: FC<RestaurantCardProps> = ({ restaurant, mapLink, onInvite, className, style, onSave, isSaved, onDelete, managementControls }) => {
    return (
        <div 
            className={`bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300 ease-in-out h-full border border-gray-100 hover:shadow-xl hover:border-blue-200 ${className}`}
            style={style}
        >
            <div>
                <div className="flex justify-between items-start mb-2 gap-3">
                    <h3 className="text-xl font-bold text-gray-800 flex-1">{restaurant.name}</h3>
                    <div className="flex items-center flex-shrink-0">
                        {restaurant.priceRange && <div className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md mr-2">{restaurant.priceRange}</div>}
                        {onSave && (
                            <button 
                                onClick={onSave} 
                                disabled={isSaved} 
                                aria-label={isSaved ? 'Restaurant is saved' : 'Save restaurant'}
                                className="text-gray-400 hover:text-blue-500 disabled:text-blue-500 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaved ? <BookmarkFilledIcon className="w-6 h-6"/> : <BookmarkIcon className="w-6 h-6"/>}
                            </button>
                        )}
                    </div>
                </div>
                 {restaurant.rating && (
                    <div className="mb-3">
                        {renderStars(restaurant.rating)}
                    </div>
                )}
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">{restaurant.description}</p>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
                {mapLink && (
                    <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                    >
                        <MapPinIcon /> View on Map
                    </a>
                )}
                <button
                    onClick={onInvite}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-sm"
                >
                    <MessageSquareIcon /> Invite Friends
                </button>
                {managementControls}
                {onDelete && (
                     <button
                        onClick={onDelete}
                        className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                    >
                        <TrashIcon /> Delete
                    </button>
                )}
            </div>
        </div>
    );
};
