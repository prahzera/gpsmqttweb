const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");

// Configuración de la conexión MQTT
const options = {
  username: 'ArthurRios',
  password: 'arthuralex99',
};
console.log(options);
// Conéctate al servidor MQTT
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com', options); // mqtt://broker.hivemq.com

// Define la ruta al archivo JSON donde se almacenan las coordenadas
const dataFilePath = path.join(__dirname, "../coordinates.json");
const lastCoordFilePath = path.join(__dirname, "../lastCoordinate.json");

let coordinates = { lat: null, lon: null }; // Variable para almacenar las coordenadas actuales
let lastSavedCoord = null; // Variable para almacenar la última coordenada válida

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
  
  // Actualiza la variable global de última coordenada
  lastSavedCoord = newCoord;
};

// Función para leer las coordenadas almacenadas desde el archivo JSON
const readCoordinates = () => {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return [];
};

// Función para cargar la última coordenada al iniciar
const loadLastCoordinate = () => {
  if (fs.existsSync(lastCoordFilePath)) {
    try {
      const data = fs.readFileSync(lastCoordFilePath);
      lastSavedCoord = JSON.parse(data);
      console.log('Última coordenada cargada:', lastSavedCoord);
    } catch (error) {
      console.error('Error al cargar la última coordenada:', error);
    }
  }
};

// Carga la última coordenada al iniciar
loadLastCoordinate();

// Evento cuando el cliente MQTT se conecta al servidor
mqttClient.on('connect', () => {
  console.log('Conectado al servidor MQTT');

  // Suscribirse a los dos tópicos
  mqttClient.subscribe('latgps/perro1');
  mqttClient.subscribe('longps/perro1');
});

// Variable para almacenar la instancia de socket.io
let io;

// Evento cuando se recibe un mensaje en alguno de los tópicos suscritos
mqttClient.on('message', (topic, message) => {
  try {
    const payload = parseFloat(message.toString()); // Convertir el mensaje a número
    
    // Añadir console.log para mostrar el mensaje recibido
    console.log(`[${new Date().toISOString()}] Mensaje MQTT recibido - Tópico: ${topic}, Valor: ${payload}`);

    if (topic === 'latgps/perro1') {
      coordinates.lat = payload;
    } else if (topic === 'longps/perro1') {
      coordinates.lon = payload;
    }

    // Si ambas coordenadas están disponibles, validar y escribir en el archivo
    if (coordinates.lat !== null && coordinates.lon !== null) {
      if (isValidCoordinate(coordinates)) {
        const newCoord = {
          lat: coordinates.lat,
          lon: coordinates.lon,
          timestamp: new Date().toISOString()
        };

        // Mostrar las coordenadas completas que serán guardadas
        console.log(`[${new Date().toISOString()}] Nuevas coordenadas guardadas: Lat=${newCoord.lat}, Lon=${newCoord.lon}`);

        writeCoordinates(newCoord); // Escribir las nuevas coordenadas en el archivo JSON
        
        // Emitir las nuevas coordenadas a todos los clientes conectados mediante Socket.IO
        if (io) {
          io.emit('coordinates', newCoord);
          console.log('Coordenadas emitidas a los clientes conectados');
        }
        
        coordinates = { lat: null, lon: null }; // Reiniciar las coordenadas para la próxima vez
      } else {
        console.log(`[${new Date().toISOString()}] Coordenadas inválidas descartadas: Lat=${coordinates.lat}, Lon=${coordinates.lon}`);
        coordinates = { lat: null, lon: null }; // Reiniciar las coordenadas
      }
    }
  } catch (error) {
    console.error("Error al procesar el mensaje MQTT:", error);
  }
});

// Exporta una función para manejar la conexión de socket.io
module.exports = (socketIo) => {
  io = socketIo; // Guardar la referencia a la instancia de socket.io
  
  io.on('connection', (socket) => {
    console.log('Cliente conectado vía socket.io');
    
    // Enviar la última coordenada guardada al cliente que se conecta
    if (lastSavedCoord) {
      socket.emit('lastLocation', lastSavedCoord);
      console.log('Última ubicación enviada al cliente:', lastSavedCoord);
    }

    socket.on('disconnect', () => {
      console.log('Cliente desconectado');
    });
  });
};
