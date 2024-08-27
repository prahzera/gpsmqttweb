const map = L.map('map').setView([0, 0], 16); // Inicializa el mapa centrado en las coordenadas [0, 0] y con un nivel de zoom 16
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // Agrega una capa de tiles de OpenStreetMap al mapa
    maxZoom: 19, // Define el zoom máximo que se puede aplicar en el mapa
}).addTo(map); // Agrega la capa de tiles al mapa

const customIcon = L.icon({ // Crea un ícono personalizado para el marcador
    iconUrl: '/images/icon.png', // Especifica la ruta de la imagen del ícono
    iconSize: [64, 64], // Define el tamaño del ícono en 64x64 píxeles
    iconAnchor: [32, 64], // Ajusta el punto de anclaje del ícono, centrando el ícono en el marcador
    popupAnchor: [0, -64] // Ajusta la posición del popup en relación al ícono
});

const marker = L.marker([0, 0], { icon: customIcon }).addTo(map); // Crea un marcador en [0, 0] usando el ícono personalizado y lo agrega al mapa
const socket = io(); // Inicializa la conexión al servidor usando Socket.IO
let routeLayer = L.layerGroup().addTo(map); // Crea un grupo de capas para la ruta y lo agrega al mapa

// Función para calcular la distancia entre dos puntos geográficos
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180; // Calcula la diferencia en latitud y la convierte a radianes
    const dLon = (lon2 - lon1) * Math.PI / 180; // Calcula la diferencia en longitud y la convierte a radianes
    const a =
        0.5 - Math.cos(dLat) / 2 + // Calcula la fórmula de haversine para la distancia
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a)); // Devuelve la distancia calculada en km
};

const drawRoute = (coords) => { 
    routeLayer.clearLayers(); // Limpia la capa antes de agregar la nueva ruta
    const latlngs = coords.map(coord => [coord.lat, coord.lon]); // Convierte las coordenadas en un array de pares latitud-longitud

    // Dibuja la línea de la ruta
    L.polyline(latlngs, { color: '#5a7167', weight: 3 }).addTo(routeLayer); // Dibuja la línea de la ruta en el mapa con un color y grosor específico

    // Agrega un círculo en cada punto de la ruta
    coords.forEach(coord => { 
        L.circleMarker([coord.lat, coord.lon], { // Crea un marcador circular en cada punto de la ruta
            color: '#5a7167', // Define el color del borde del círculo
            fillColor: '#5a7167', // Define el color de relleno del círculo
            fillOpacity: 0.7, // Define la opacidad del relleno
            radius: 6 // Define el radio del círculo
        })
            .bindPopup(`Hora: ${new Date(coord.timestamp).toLocaleTimeString()}`) // Agrega un popup que muestra la hora en cada círculo
            .addTo(routeLayer); // Agrega el círculo a la capa de la ruta
    });
};

// Función para actualizar el resumen de distancia recorrida
const updateDistanceSummary = (coords) => { 
    let totalDistance = 0; 
    for (let i = 1; i < coords.length; i++) { // Recorre las coordenadas para calcular la distancia total
        totalDistance += calculateDistance(coords[i - 1].lat, coords[i - 1].lon, coords[i].lat, coords[i].lon); // Suma la distancia entre cada par de puntos
    }
    document.getElementById('distance-current').textContent = `${totalDistance.toFixed(2)} km`; // Muestra la distancia total en el elemento correspondiente
};

const updateRoute = (minutes) => { 
    fetch(`/route/${minutes}`) // Hace una solicitud para obtener la ruta en base al intervalo de tiempo seleccionado
        .then(response => response.json()) // Convierte la respuesta a formato JSON
        .then(data => { 
            drawRoute(data); // Dibuja la ruta con los datos recibidos
            updateDistanceSummary(data); // Actualiza el resumen de distancia con los datos recibidos
        })
        .catch(error => console.error('Error al obtener la ruta:', error)); // Muestra un error en caso de que la solicitud falle
};

// Maneja el cambio en la selección del intervalo de tiempo
document.getElementById('timeRange').addEventListener('change', (event) => { 
    const minutes = event.target.value; // Obtiene el valor seleccionado en el rango de tiempo
    updateRoute(minutes); // Actualiza la ruta y el resumen en base al nuevo intervalo de tiempo
});

// Obtiene la última ubicación al cargar la página
fetch('/last-location') 
    .then(response => response.json()) // Convierte la respuesta a formato JSON
    .then(data => { 
        if (data.lat && data.lon) { // Si hay datos de latitud y longitud, centra el mapa en esa ubicación
            map.setView([data.lat, data.lon], 17); // Centra el mapa en la última ubicación conocida
            marker.setLatLng([data.lat, data.lon]); // Mueve el marcador a la última ubicación conocida
        }
    });

// Inicializa el mapa y la distancia al cargar la página
const timeRange = document.getElementById('timeRange').value; // Obtiene el intervalo de tiempo seleccionado
updateRoute(timeRange); // Actualiza la ruta y el resumen de distancia al cargar la página

// Escucha las nuevas coordenadas del servidor
socket.on('coordinates', (coord) => { 
    marker.setLatLng([coord.lat, coord.lon]); // Mueve el marcador a la nueva ubicación recibida
    map.setView([coord.lat, coord.lon]); // Centra el mapa en la nueva ubicación recibida

    // Actualiza el historial en el mapa con el intervalo actual
    const timeRange = document.getElementById('timeRange').value; // Obtiene el intervalo de tiempo seleccionado
    updateRoute(timeRange); // Actualiza la ruta y el resumen de distancia con la nueva ubicación
});

// Crear un control personalizado para centrar el mapa
L.Control.CustomButton = L.Control.extend({ 
    onAdd: function (map) { 
        var container = L.DomUtil.create('div', 'leaflet-control-custom'); // Crea un contenedor para el botón personalizado
        var img = L.DomUtil.create('img', '', container); // Crea un elemento de imagen dentro del contenedor
        img.src = '/images/gps.png'; // Especifica la ruta de la imagen del ícono para centrar la ubicación

        L.DomEvent.on(container, 'click', function () { 
            // Centra el mapa en la última ubicación recibida
            if (marker.getLatLng()) { // Si hay una ubicación válida en el marcador
                map.setView(marker.getLatLng(), map.getZoom()); // Centra el mapa en esa ubicación con el zoom actual
            }
        });

        return container; // Devuelve el contenedor del botón personalizado
    }
});

L.control.customButton = function (opts) { 
    return new L.Control.CustomButton(opts); // Permite crear y agregar el control personalizado al mapa
};

L.control.customButton().addTo(map); // Agrega el botón personalizado al mapa