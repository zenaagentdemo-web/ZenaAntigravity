import React from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Deal } from '../types';
import './TerritoryMap.css';
import { getMockCoordinates } from './mockGeocoder';
import { Map3DOverlay } from './Map3DOverlay';
import { MapControls } from './MapControls';

interface TerritoryMapProps {
    deals: Deal[];
    onDealSelect: (deal: Deal) => void;
}

const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '600px',
    borderRadius: '16px',
    overflow: 'hidden'
};

const center = {
    lat: -36.8485, // Auckland
    lng: 174.7633
};

import { cyberpunkMapStyle } from './CyberpunkMapStyle';

// Dark/Cyberpunk Map Style
const mapOptions = {
    disableDefaultUI: true,
    styles: cyberpunkMapStyle,
    minZoom: 13,
    maxZoom: 20,
    backgroundColor: '#0d1b2a', // Match the map background to avoid flashes
};

export const TerritoryMap: React.FC<TerritoryMapProps> = ({ deals, onDealSelect }) => {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
    });

    const [map, setMap] = React.useState<google.maps.Map | null>(null);

    // Memoize the deals with coordinates
    const geoDeals = React.useMemo(() => {
        return deals.map(deal => ({
            ...deal,
            coordinates: getMockCoordinates(deal.id, deal.property?.address || 'unknown')
        }));
    }, [deals]);

    const onLoad = React.useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    if (loadError) {
        return (
            <div className="deal-flow__error" style={{ padding: '2rem', color: '#ef4444', textAlign: 'center' }}>
                <p>⚠️ Google Maps failed to load.</p>
                <p style={{ fontSize: '0.9em', opacity: 0.8 }}>Check your internet connection or API key configuration.</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="deal-flow__loading">
                <div className="deal-flow__loading-spinner" />
                <span>Initializing Territory Map...</span>
            </div>
        );
    }

    // Double check that the global object exists to prevent crashes
    if (!window.google || !window.google.maps) {
        return (
            <div className="deal-flow__error" style={{ padding: '2rem', color: '#ef4444', textAlign: 'center', background: '#1e293b', borderRadius: '12px' }}>
                <h3>Configuration Error</h3>
                <p>The Google Maps API script loaded but the global object is missing.</p>
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', fontFamily: 'monospace', textAlign: 'left' }}>
                    <p style={{ color: '#fbbf24' }}>Status: {import.meta.env.VITE_GOOGLE_MAPS_KEY ? 'Key Found' : 'No API Key Detected'}</p>
                    <p>Please ensure you have a valid <code>VITE_GOOGLE_MAPS_KEY</code> in <code>packages/frontend/.env</code>.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="territory-map-container" style={{ position: 'relative' }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
            >
                {/* 3D Overlay */}
                {map && (
                    <Map3DOverlay
                        map={map}
                        deals={geoDeals}
                        onDealSelect={onDealSelect}
                    />
                )}
            </GoogleMap>
            <MapControls />
        </div>
    );
};
