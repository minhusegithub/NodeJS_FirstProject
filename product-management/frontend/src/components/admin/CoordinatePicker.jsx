import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Click handler component
const MapClickHandler = ({ onMapClick }) => {
    const map = useMap();
    
    useEffect(() => {
        if (!map) return;
        
        const handleClick = (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
        };
        
        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [map, onMapClick]);

    return null;
};

const CoordinatePicker = ({ latitude = '', longitude = '', onConfirm, onClose }) => {
    const [selectedLat, setSelectedLat] = useState(latitude ? parseFloat(latitude) : 21.0285);
    const [selectedLng, setSelectedLng] = useState(longitude ? parseFloat(longitude) : 105.8542);

    const handleMapClick = (lat, lng) => {
        setSelectedLat(lat);
        setSelectedLng(lng);
    };

    const handleConfirm = () => {
        onConfirm(selectedLat.toFixed(8), selectedLng.toFixed(8));
    };

    // Configure marker icon
    const markerIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content coordinate-picker-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Chọn tọa độ trên bản đồ</h3>
                    <button type="button" className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="coordinate-picker-body">
                    <div className="coordinate-picker-map">
                        <MapContainer 
                            center={[selectedLat, selectedLng]} 
                            zoom={15} 
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            <Marker position={[selectedLat, selectedLng]} icon={markerIcon}>
                                <Popup>
                                    <div className="marker-popup">
                                        <div className="popup-title">Vị trí đã chọn</div>
                                        <div className="popup-coords">
                                            Lat: {selectedLat.toFixed(8)}<br />
                                            Lng: {selectedLng.toFixed(8)}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                            <MapClickHandler onMapClick={handleMapClick} />
                        </MapContainer>
                    </div>

                    <div className="coordinate-picker-info-inline">
                        
                        <div className="coordinate-display-inline">
                            <strong>Tọa độ:</strong> ({selectedLat.toFixed(8)}, {selectedLng.toFixed(8)})
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button type="button" className="store-btn store-btn-secondary" onClick={onClose}>
                        Hủy
                    </button>
                    <button type="button" className="store-btn store-btn-primary" onClick={handleConfirm}>
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CoordinatePicker;
