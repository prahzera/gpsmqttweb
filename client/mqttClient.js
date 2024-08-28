const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");

// Configuración de la conexión MQTT
const options = {
  username: 'ArthurRios',
  password: 'arthuralex99',
};

// Conéctate al servidor MQTT
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com', options);

// Define la ruta al archivo JSON donde se almacenan las coordenadas
const dataFilePath = path.join(__dirname, "../coordinates.json");
const lastCoordFilePath = path.join(__dirname, "../lastCoordinate.json");

let coordinates = { lat: null, lon: null }; // Variable para almacenar las coordenadas actuales

// Función para validar coordenadas (descartar aquellas que tienen valor 0)
const isValidCoordinate = (coord) => {
  return coord.lat !== 0 && coord.lon !== 0;
};

// Función para escribir nuevas coordenadas en el archivo JSON
const writeCoordinates = (newCoord) => {
  const coords = readCoordinates(); // Lee las coordenadas actuales
  coords.push(newCoord); // Agrega las nuevas coordenadas al arreglo
  fs.writeFileSync(dataFilePath, JSON.stringify(coords, null, 2)); // Escribe el archivo JSON actualizado

  // Actualiza el archivo de la última coordenada
  fs.writeFileSync(lastCoordFilePath, JSON.stringify(newCoord, null, 2));
};

// Función para leer las coordenadas almacenadas desde el archivo JSON
const readCoordinates = () => {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return [];
};

// Evento cuando el cliente MQTT se conecta al servidor
mqttClient.on('connect', () => {
  console.log('Conectado al servidor MQTT');
  mqttClient.subscribe('mi-topico'); // Suscribirse a un tema específico
});

// Evento cuando se recibe un mensaje en el tema suscrito
mqttClient.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    if (isValidCoordinate(payload)) {
      const newCoord = {
        lat: payload.lat,
        lon: payload.lon,
        timestamp: new Date().toISOString()
      };

      writeCoordinates(newCoord); // Escribir las nuevas coordenadas en el archivo JSON
      coordinates = newCoord; // Actualizar la variable con la nueva coordenada
    }
  } catch (error) {
    console.error("Error al procesar el mensaje MQTT:", error);
  }
});

// Exporta una función para manejar la conexión de socket.io
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Cliente conectado vía socket.io');

    socket.emit('lastCoordinate', coordinates);

    socket.on('disconnect', () => {
      console.log('Cliente desconectado');
    });
  });
};
