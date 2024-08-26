const mqtt = require('mqtt');

// Conéctate al servidor MQTT local
const client = mqtt.connect('mqtt://localhost:1883');

// Coordenadas de referencia
const baseLat = -25.358688;
const baseLon = -57.496090;

// Variación máxima en grados (1 cuadra ≈ 0.0001 grados)
const latVariation = 0.001;
const lonVariation = 0.001;

client.on('connect', () => {
  console.log('Conectado al servidor MQTT local');

  // Publica coordenadas aleatorias dentro del rango de variación cada 60 segundos
  setInterval(() => {
    const lat = (baseLat + (Math.random() * latVariation * 2 - latVariation)).toFixed(6);
    const lon = (baseLon + (Math.random() * lonVariation * 2 - lonVariation)).toFixed(6);

    client.publish('latgps/perro1', lat.toString(), () => {
      console.log('Publicado latitud:', lat);
    });

    client.publish('longps/perro1', lon.toString(), () => {
      console.log('Publicado longitud:', lon);
    });
  }, 10000); // Cada 60 segundos
});

client.on('error', (err) => {
  console.error('Error de conexión:', err);
});
