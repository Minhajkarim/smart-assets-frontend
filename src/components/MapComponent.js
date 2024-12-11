import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = ({ currentLocation, detectedObjects }) => {
    const mapRef = useRef(null); // Reference to the map container
    const mapInstance = useRef(null); // Reference to the Leaflet map instance

    useEffect(() => {
        // Initialize the map only once
        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([51.505, -0.09], 13);

            // Add a tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapInstance.current);
        }

        // Update the map when `currentLocation` changes
        if (currentLocation) {
            const [lat, lng] = currentLocation;
            L.marker([lat, lng]).addTo(mapInstance.current).bindPopup('You are here').openPopup();
            mapInstance.current.setView([lat, lng], 13);
        }

        // Add markers for detected objects
        if (detectedObjects) {
            detectedObjects.forEach(({ lat, lng, label }) => {
                L.marker([lat, lng])
                    .addTo(mapInstance.current)
                    .bindPopup(`Detected: ${label}`);
            });
        }

        // Cleanup old markers (if required, based on detectedObjects updating logic)
        // This step prevents marker duplication.

    }, [currentLocation, detectedObjects]); // Effect runs when these props update

    return (
        <div
            ref={mapRef}
            style={{ height: '400px', width: '100%', margin: '20px 0' }}
        ></div>
    );
};

export default MapComponent;
