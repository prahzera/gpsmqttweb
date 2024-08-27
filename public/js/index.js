const map = L.map('map').setView([0, 0], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

const customIcon = L.icon({
    iconUrl: '/images/icon.png',
    iconSize: [64, 64], // Cambiado a 64x64 píxeles
    iconAnchor: [32, 64], // Ajustado para centrar el ícono en el marcador
    popupAnchor: [0, -64] // Ajustado para que el popup aparezca correctamente
});

const marker = L.marker([0, 0], { icon: customIcon }).addTo(map);
const socket = io();
let routeLayer = L.layerGroup().addTo(map);

// Función para calcular la distancia entre dos puntos geográficos
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
};

const drawRoute = (coords) => {
    routeLayer.clearLayers(); // Limpia la capa antes de agregar nueva ruta
    const latlngs = coords.map(coord => [coord.lat, coord.lon]);

    // Dibuja la línea de la ruta
    L.polyline(latlngs, { color: '#5a7167', weight: 3 }).addTo(routeLayer);

    // Agrega un círculo en cada punto de la ruta
    coords.forEach(coord => {
        L.circleMarker([coord.lat, coord.lon], {
            color: '#5a7167', // Color del borde del círculo
            fillColor: '#5a7167', // Color de relleno del círculo
            fillOpacity: 0.7, // Opacidad del relleno
            radius: 6 // Radio del círculo
        })
            .bindPopup(`Hora: ${new Date(coord.timestamp).toLocaleTimeString()}`)
            .addTo(routeLayer);
    });
};

// Función para actualizar el resumen de distancia recorrida
const updateDistanceSummary = (coords) => {
    let totalDistance = 0;
    for (let i = 1; i < coords.length; i++) {
        totalDistance += calculateDistance(coords[i - 1].lat, coords[i - 1].lon, coords[i].lat, coords[i].lon);
    }
    document.getElementById('distance-current').textContent = `${totalDistance.toFixed(2)} km`;
};

const updateRoute = (minutes) => {
    fetch(`/route/${minutes}`)
        .then(response => response.json())
        .then(data => {
            drawRoute(data);
            updateDistanceSummary(data);
        })
        .catch(error => console.error('Error al obtener la ruta:', error));
};

// Maneja el cambio en la selección del intervalo de tiempo
document.getElementById('timeRange').addEventListener('change', (event) => {
    const minutes = event.target.value;
    updateRoute(minutes);
});

// Obtiene la última ubicación al cargar la página
fetch('/last-location')
    .then(response => response.json())
    .then(data => {
        if (data.lat && data.lon) {
            map.setView([data.lat, data.lon], 16);
            marker.setLatLng([data.lat, data.lon]);
        }
    });

// Inicializa el mapa y la distancia al cargar la página
const timeRange = document.getElementById('timeRange').value;
updateRoute(timeRange);

// Escucha las nuevas coordenadas del servidor
socket.on('coordinates', (coord) => {
    marker.setLatLng([coord.lat, coord.lon]);
    map.setView([coord.lat, coord.lon]);

    // Actualizar el historial en el mapa con el intervalo actual
    const timeRange = document.getElementById('timeRange').value;
    updateRoute(timeRange);
});