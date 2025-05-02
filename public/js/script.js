const map = L.map('map').setView([-25.2637, -57.5759], 16); // Asunción, Paraguay
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

// Inicializar los input de fecha
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');

// Configuración inicial de fechas
const today = new Date().toISOString().split('T')[0];
startDateInput.setAttribute('max', today);
endDateInput.setAttribute('max', today);

// Prevenir selección de fechas inválidas
startDateInput.addEventListener('change', () => {
    // La fecha final no puede ser anterior a la fecha inicial
    endDateInput.setAttribute('min', startDateInput.value);
    
    // Si la fecha final es anterior a la inicial, actualizar la fecha final
    if (endDateInput.value && endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
    }
});

endDateInput.addEventListener('change', () => {
    // La fecha inicial no puede ser posterior a la fecha final
    startDateInput.setAttribute('max', endDateInput.value || today);
    
    // Si la fecha inicial es posterior a la final, actualizar la fecha inicial
    if (startDateInput.value && startDateInput.value > endDateInput.value) {
        startDateInput.value = endDateInput.value;
    }
});

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

// Nueva función para calcular la velocidad entre dos puntos
const calculateSpeed = (lat1, lon1, time1, lat2, lon2, time2) => {
    // Calcula la distancia en km
    const distanceKm = calculateDistance(lat1, lon1, lat2, lon2);
    
    // Calcula la diferencia de tiempo en horas
    const timeHrs = (new Date(time2) - new Date(time1)) / (1000 * 60 * 60);
    
    // Evita división por cero
    if (timeHrs === 0) return 0;
    
    // Devuelve la velocidad en km/h
    return distanceKm / timeHrs;
};

const drawRoute = (coords) => { 
    routeLayer.clearLayers(); // Limpia la capa antes de agregar la nueva ruta
    
    if (coords.length === 0) {
        document.getElementById('distance-current').textContent = '0 km';
        // Limpiar velocidad si existe el elemento
        if (document.getElementById('speed-average')) {
            document.getElementById('speed-average').textContent = '0 km/h';
        }
        return;
    }
    
    const latlngs = coords.map(coord => [coord.lat, coord.lon]); // Convierte las coordenadas en un array de pares latitud-longitud

    // Dibuja la línea de la ruta
    L.polyline(latlngs, { color: '#5a7167', weight: 3 }).addTo(routeLayer); // Dibuja la línea de la ruta en el mapa con un color y grosor específico

    // Agrega un círculo en cada punto de la ruta
    coords.forEach((coord, index) => { 
        // Calcula la velocidad para mostrar en el popup (excepto el primer punto)
        let speedInfo = '';
        if (index > 0) {
            const prevCoord = coords[index - 1];
            const speed = calculateSpeed(
                prevCoord.lat, prevCoord.lon, prevCoord.timestamp,
                coord.lat, coord.lon, coord.timestamp
            );
            if (speed > 0) {
                speedInfo = `<br>Velocidad: ${speed.toFixed(1)} km/h`;
            }
        }
        
        L.circleMarker([coord.lat, coord.lon], { // Crea un marcador circular en cada punto de la ruta
            color: '#5a7167', // Define el color del borde del círculo
            fillColor: '#5a7167', // Define el color de relleno del círculo
            fillOpacity: 0.7, // Define la opacidad del relleno
            radius: 6 // Define el radio del círculo
        })
            .bindPopup(`Hora: ${new Date(coord.timestamp).toLocaleTimeString()}${speedInfo}`) // Agrega un popup que muestra la hora y velocidad en cada círculo
            .addTo(routeLayer); // Agrega el círculo a la capa de la ruta
    });
    
    // Ajusta la vista del mapa para mostrar toda la ruta
    if (coords.length > 0) {
        map.fitBounds(latlngs);
    }
};

// Función para actualizar el resumen de distancia recorrida
const updateDistanceSummary = (coords) => { 
    let totalDistance = 0; 
    let totalSpeeds = 0;
    let validSpeedPoints = 0;
    
    for (let i = 1; i < coords.length; i++) { // Recorre las coordenadas para calcular la distancia total
        const distance = calculateDistance(coords[i - 1].lat, coords[i - 1].lon, coords[i].lat, coords[i].lon);
        totalDistance += distance; // Suma la distancia entre cada par de puntos
        
        // Calcula la velocidad en este segmento de ruta
        const speed = calculateSpeed(
            coords[i - 1].lat, coords[i - 1].lon, coords[i - 1].timestamp,
            coords[i].lat, coords[i].lon, coords[i].timestamp
        );
        
        // Suma la velocidad si es válida (> 0)
        if (speed > 0) {
            totalSpeeds += speed;
            validSpeedPoints++;
        }
    }
    
    // Actualiza la distancia en el elemento correspondiente
    document.getElementById('distance-current').textContent = `${totalDistance.toFixed(2)} km`;
    
    // Calcula y actualiza la velocidad promedio si hay puntos válidos
    if (validSpeedPoints > 0 && document.getElementById('speed-average')) {
        const avgSpeed = totalSpeeds / validSpeedPoints;
        document.getElementById('speed-average').textContent = `${avgSpeed.toFixed(1)} km/h`;
    } else if (document.getElementById('speed-average')) {
        document.getElementById('speed-average').textContent = '0 km/h';
    }
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

// Nueva función para actualizar la ruta por rango de fechas
const updateRouteByDateRange = (startDate, endDate) => {
    fetch(`/route-by-dates?startDate=${startDate}&endDate=${endDate}`)
        .then(response => response.json())
        .then(data => {
            drawRoute(data);
            updateDistanceSummary(data);
        })
        .catch(error => console.error('Error al obtener la ruta por fechas:', error));
};

// Maneja el cambio en la selección del intervalo de tiempo
document.getElementById('timeRange').addEventListener('change', (event) => { 
    const minutes = event.target.value; // Obtiene el valor seleccionado en el rango de tiempo
    updateRoute(minutes); // Actualiza la ruta y el resumen en base al nuevo intervalo de tiempo
});

// Manejar el botón para aplicar el rango de fechas
document.getElementById('applyDateRange').addEventListener('click', () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (startDate && endDate) {
        updateRouteByDateRange(startDate, endDate);
    } else {
        alert('Por favor, seleccione fechas de inicio y fin');
    }
});

// Escucha las nuevas coordenadas del servidor
socket.on('coordinates', (coord) => { 
    console.log('Nueva coordenada recibida:', coord);
    marker.setLatLng([coord.lat, coord.lon]); // Mueve el marcador a la nueva ubicación recibida
    map.setView([coord.lat, coord.lon]); // Centra el mapa en la nueva ubicación recibida

    // Actualiza el historial en el mapa con el intervalo actual
    const timeRange = document.getElementById('timeRange').value; // Obtiene el intervalo de tiempo seleccionado
    updateRoute(timeRange); // Actualiza la ruta y el resumen de distancia con la nueva ubicación
});

// También recibe la última ubicación al conectar
socket.on('lastLocation', (coord) => {
    console.log('Última ubicación recibida:', coord);
    if (coord && coord.lat && coord.lon) { // Si hay datos de latitud y longitud, centra el mapa en esa ubicación
        map.setView([coord.lat, coord.lon], 17); // Centra el mapa en la última ubicación conocida
        marker.setLatLng([coord.lat, coord.lon]); // Mueve el marcador a la última ubicación conocida
    }
});

// Obtiene la última ubicación al cargar la página (fallback por si el socket no funciona)
fetch('/last-location') 
    .then(response => response.json()) // Convierte la respuesta a formato JSON
    .then(data => { 
        if (data.lat && data.lon) { // Si hay datos de latitud y longitud, centra el mapa en esa ubicación
            console.log('Última ubicación obtenida por fetch:', data);
            map.setView([data.lat, data.lon], 17); // Centra el mapa en la última ubicación conocida
            marker.setLatLng([data.lat, data.lon]); // Mueve el marcador a la última ubicación conocida
        }
    });

// Inicializa el mapa y la distancia al cargar la página
const timeRange = document.getElementById('timeRange').value; // Obtiene el intervalo de tiempo seleccionado
updateRoute(timeRange); // Actualiza la ruta y el resumen de distancia al cargar la página

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

// Asegurarse de que el mapa se redimensione correctamente cuando cambia el tamaño de la ventana
window.addEventListener('resize', function() {
    map.invalidateSize({animate: true});
    
    // Si hay una ruta visible, ajustar la vista para mostrarla completa
    if (routeLayer && routeLayer.getLayers().length > 0) {
        const bounds = routeLayer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds);
        }
    }
});

// Invalidar tamaño del mapa una vez que la página se haya cargado completamente
document.addEventListener('DOMContentLoaded', function() {
    // Forzar múltiples actualizaciones del mapa para asegurar que se renderice correctamente
    setTimeout(function() {
        map.invalidateSize({animate: true});
    }, 100);
    
    setTimeout(function() {
        map.invalidateSize({animate: true});
    }, 500);
    
    setTimeout(function() {
        map.invalidateSize({animate: true});
    }, 1000);
});

// Asegurarse de que el mapa se reinicie correctamente después de cambios en la UI
if (document.getElementById('mobile-controls-toggle')) {
    document.getElementById('mobile-controls-toggle').addEventListener('click', function() {
        setTimeout(function() {
            map.invalidateSize({animate: true});
        }, 400);
    });
}

if (document.querySelector('.close-controls')) {
    document.querySelector('.close-controls').addEventListener('click', function() {
        setTimeout(function() {
            map.invalidateSize({animate: true});
        }, 400);
    });
}