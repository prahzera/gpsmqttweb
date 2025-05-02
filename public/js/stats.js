// Función para actualizar el histograma y las estadísticas de velocidad
function updateSpeedHistogram(speeds) {
    // Si no hay velocidades, mostrar mensaje vacío
    if (!speeds || speeds.length === 0) {
        document.getElementById('speed-histogram').innerHTML = '<div class="no-data">No hay datos de velocidad disponibles</div>';
        document.getElementById('max-speed').textContent = '0 km/h';
        document.getElementById('min-speed').textContent = '0 km/h';
        document.getElementById('moving-time').textContent = '0 min';
        return;
    }

    // Filtrar velocidades > 0 para calcular estadísticas reales
    const validSpeeds = speeds.filter(speed => speed > 0);
    
    if (validSpeeds.length === 0) {
        document.getElementById('speed-histogram').innerHTML = '<div class="no-data">No hay movimiento detectado</div>';
        document.getElementById('max-speed').textContent = '0 km/h';
        document.getElementById('min-speed').textContent = '0 km/h';
        document.getElementById('moving-time').textContent = '0 min';
        return;
    }

    // Calcular velocidades máx/min y tiempo en movimiento
    const maxSpeed = Math.max(...validSpeeds).toFixed(1);
    const minSpeed = Math.min(...validSpeeds).toFixed(1);
    
    // Estimar tiempo en movimiento (asumiendo intervalos regulares entre coordenadas)
    const movingSeconds = validSpeeds.length * 5; // Asumiendo puntos cada ~5 segundos
    const movingMinutes = Math.round(movingSeconds / 60);
    
    // Actualizar estadísticas
    document.getElementById('max-speed').textContent = `${maxSpeed} km/h`;
    document.getElementById('min-speed').textContent = `${minSpeed} km/h`;
    document.getElementById('moving-time').textContent = `${movingMinutes} min`;

    // Crear histograma
    const histogramContainer = document.getElementById('speed-histogram');
    histogramContainer.innerHTML = '';
    
    // Definir rangos para el histograma (de 5 en 5 km/h)
    const maxRangeValue = Math.ceil(maxSpeed / 5) * 5;
    const ranges = [];
    for (let i = 0; i <= maxRangeValue; i += 5) {
        ranges.push({
            min: i,
            max: i + 5,
            count: 0
        });
    }
    
    // Contar velocidades en cada rango
    validSpeeds.forEach(speed => {
        const rangeIndex = Math.floor(speed / 5);
        if (rangeIndex < ranges.length) {
            ranges[rangeIndex].count++;
        }
    });
    
    // Encontrar el conteo máximo para escalar el histograma
    const maxCount = Math.max(...ranges.map(r => r.count));
    
    // Crear barras del histograma
    ranges.forEach(range => {
        if (range.count > 0) {
            const heightPercentage = (range.count / maxCount) * 100;
            const bar = document.createElement('div');
            bar.className = 'histogram-bar';
            bar.style.height = `${heightPercentage}%`;
            bar.setAttribute('data-value', `${range.min}-${range.max} km/h`);
            bar.title = `${range.count} registros entre ${range.min}-${range.max} km/h`;
            histogramContainer.appendChild(bar);
        }
    });
}

// Función para recolectar las velocidades de la ruta actual
function collectSpeedsFromRoute() {
    // Hacer una solicitud al servidor para obtener los datos según el filtro actual
    let routeUrl;
    
    // Verificar si hay rango de fechas seleccionado
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        routeUrl = `/route-by-dates?startDate=${startDate}&endDate=${endDate}`;
    } else {
        // Usar el filtro de tiempo rápido
        const timeRange = document.getElementById('timeRange').value;
        routeUrl = `/route/${timeRange}`;
    }
    
    // Obtener los datos de la ruta
    fetch(routeUrl)
        .then(response => response.json())
        .then(coordinates => {
            // Calcular velocidades entre pares de coordenadas
            const speeds = [];
            for (let i = 1; i < coordinates.length; i++) {
                const speed = calculateSpeed(
                    coordinates[i-1].lat, coordinates[i-1].lon, coordinates[i-1].timestamp,
                    coordinates[i].lat, coordinates[i].lon, coordinates[i].timestamp
                );
                speeds.push(speed);
            }
            
            // Actualizar el histograma con los datos
            updateSpeedHistogram(speeds);
        })
        .catch(error => {
            console.error('Error al obtener datos para estadísticas:', error);
            updateSpeedHistogram([]);
        });
}

// Evento para mostrar estadísticas cuando se abre el modal
document.getElementById('show-stats').addEventListener('click', function() {
    collectSpeedsFromRoute();
});

// Actualizar estadísticas cuando cambia el filtro
document.getElementById('timeRange').addEventListener('change', function() {
    // Solo actualizar si el modal está visible
    if (document.getElementById('stats-modal').classList.contains('active')) {
        collectSpeedsFromRoute();
    }
});

// Actualizar estadísticas cuando se aplica rango de fechas
document.getElementById('applyDateRange').addEventListener('click', function() {
    // Solo actualizar si el modal está visible
    if (document.getElementById('stats-modal').classList.contains('active')) {
        collectSpeedsFromRoute();
    }
}); 