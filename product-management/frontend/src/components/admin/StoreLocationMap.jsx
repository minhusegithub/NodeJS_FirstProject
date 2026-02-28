import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultMarker = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultMarker;

const StoreLocationMap = ({ stores = [] }) => {
    const storesWithCoordinates = useMemo(() => {
        return stores
            .map((store) => ({
                ...store,
                latitudeNumber: Number(store.latitude),
                longitudeNumber: Number(store.longitude)
            }))
            .filter(
                (store) =>
                    Number.isFinite(store.latitudeNumber) &&
                    Number.isFinite(store.longitudeNumber)
            );
    }, [stores]);

    const mapCenter = useMemo(() => {
        if (storesWithCoordinates.length > 0) {
            return [storesWithCoordinates[0].latitudeNumber, storesWithCoordinates[0].longitudeNumber];
        }
        return [21.0285, 105.8542];
    }, [storesWithCoordinates]);

    const formatAddress = (store) => {
        return [store.address?.street, store.address?.district, store.address?.city]
            .filter(Boolean)
            .join(', ') || '-';
    };

    return (
        <div className="store-map-panel">
            <div className="store-map-header">
                <h3>Vị trí cửa hàng trên bản đồ</h3>
                <span>{storesWithCoordinates.length} cửa hàng có tọa độ</span>
            </div>

            {storesWithCoordinates.length === 0 ? (
                <div className="store-map-empty">Chưa có cửa hàng nào có latitude/longitude để hiển thị bản đồ.</div>
            ) : (
                <div className="store-map-container">
                    <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {storesWithCoordinates.map((store) => (
                            <Marker
                                key={store.id}
                                position={[store.latitudeNumber, store.longitudeNumber]}
                            >
                                <Popup>
                                    <strong>{store.name}</strong>
                                    <br />
                                    {formatAddress(store)}
                                    <br />
                                    {store.latitudeNumber}, {store.longitudeNumber}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            )}
        </div>
    );
};

export default StoreLocationMap;
