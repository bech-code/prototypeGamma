import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { Icon } from 'leaflet';

// Fix Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface Request {
    id: number;
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    quartier?: string;
    client: string;
    service: string;
    status: string;
    is_urgent?: boolean;
}

interface AdminRequestsMapProps {
    requests: Request[];
}

// Mapping quartiers -> communes (exemple simplifié, à compléter selon besoin réel)
const quartierToCommune: Record<string, string> = {
    'Sotuba': 'Commune I',
    'Magnambougou': 'Commune VI',
    'Yirimadio': 'Commune VI',
    'Sabalibougou': 'Commune V',
    'Lafiabougou': 'Commune IV',
    'Badalabougou': 'Commune V',
    'Hamdallaye': 'Commune IV',
    'Missira': 'Commune II',
    'Niamakoro': 'Commune VI',
    'Banankabougou': 'Commune VI',
    'Daoudabougou': 'Commune V',
    'Djicoroni': 'Commune IV',
    'Sogoniko': 'Commune VI',
    'Faladié': 'Commune V',
    'Niaréla': 'Commune II',
    'Quinzambougou': 'Commune II',
    'Medina Coura': 'Commune II',
    'Bacodjicoroni': 'Commune V',
    'Torokorobougou': 'Commune V',
    'Sebenicoro': 'Commune IV',
    'Kalaban Coura': 'Commune V',
    'Kalabanbougou': 'Commune V',
    // ... compléter selon besoin
};

function isCoherent(quartier?: string, city?: string) {
    if (!quartier || !city) return true;
    const commune = quartierToCommune[quartier];
    if (!commune) return true; // quartier inconnu, on ne bloque pas
    return city.toLowerCase().includes(commune.toLowerCase());
}

// Icône spéciale pour incohérence
const alertIcon = new Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/icons/exclamation-triangle-fill.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'leaflet-alert-icon',
});

const AdminRequestsMap: React.FC<AdminRequestsMapProps> = ({ requests }) => {
    // Centre sur Bamako
    const defaultCenter: [number, number] = [12.6392, -8.0029];

    return (
        <div className="w-full h-[500px] rounded-lg overflow-hidden">
            <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {requests.map((req) => {
                    if (
                        typeof req.latitude !== 'number' ||
                        typeof req.longitude !== 'number' ||
                        isNaN(req.latitude) ||
                        isNaN(req.longitude)
                    ) {
                        return null;
                    }
                    const incoherent = !isCoherent(req.quartier, req.city);
                    return (
                        <Marker
                            key={req.id}
                            position={[req.latitude, req.longitude]}
                            {...(incoherent ? { icon: alertIcon } : {})}
                        >
                            <Popup>
                                <div>
                                    <div className="font-bold text-blue-700 mb-1">{req.service}</div>
                                    <div className="text-sm text-gray-700 mb-1">{req.address}</div>
                                    <div className="text-xs text-gray-500 mb-1">{req.quartier ? req.quartier + ', ' : ''}{req.city}</div>
                                    <div className="text-xs text-gray-500 mb-1">Client : {req.client}</div>
                                    <div className="text-xs mb-1">Statut : <span className="font-semibold">{req.status}</span></div>
                                    {req.is_urgent && <div className="text-xs text-red-600 font-bold">Urgence</div>}
                                    {/* Badge incohérence */}
                                    {incoherent && (
                                        <div className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 rounded mt-2">Incohérence quartier/commune</div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default AdminRequestsMap; 