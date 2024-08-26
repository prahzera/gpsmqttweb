const express = require("express");
const path = require("path");
const mqtt = require("mqtt");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

// Configura EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Configuración de la conexión
const options = {
  username: 'ArthurRios',
  password: 'arthuralex99',
};

// Conéctate al servidor MQTT
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com', options);

// Conéctate al servidor MQTT debug
//const mqttClient = mqtt.connect("mqtt://localhost", {});

let coordinates = { lat: null, lon: null };

// Ruta al archivo JSON donde se almacenarán las coordenadas
const dataFilePath = path.join(__dirname, "coordinates.json");
const lastCoordFilePath = path.join(__dirname, "lastCoordinate.json");

// Función para leer las coordenadas almacenadas
const readCoordinates = () => {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return [];
};

// Función para escribir nuevas coordenadas en el archivo
const writeCoordinates = (newCoord) => {
  const coords = readCoordinates();
  coords.push(newCoord);
  fs.writeFileSync(dataFilePath, JSON.stringify(coords, null, 2));
  
  // Actualiza el archivo de la última coordenada
  fs.writeFileSync(lastCoordFilePath, JSON.stringify(newCoord, null, 2));
};

// Función para filtrar coordenadas por tiempo
const filterCoordinatesByTime = (minutes) => {
  const coords = readCoordinates();
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

  return coords.filter(coord => new Date(coord.timestamp) >= cutoffTime);
};

// Conexión al servidor MQTT y manejo de mensajes
mqttClient.on("connect", () => {
  console.log("Conectado al servidor MQTT");
  mqttClient.subscribe(["longps/perro1", "latgps/perro1"], (err) => {
    if (!err) {
      console.log("Suscrito a los temas longps/perro1 y latgps/perro1");
    } else {
      console.error("Error al suscribirse a los temas:", err);
    }
  });
});

mqttClient.on("message", (topic, message) => {
  if (topic === "longps/perro1") {
    const lon = parseFloat(message.toString());
    if (lon !== 0) {
      coordinates.lon = lon;
    }
  } else if (topic === "latgps/perro1") {
    const lat = parseFloat(message.toString());
    if (lat !== 0) {
      coordinates.lat = lat;
    }
  }

  // Enviar coordenadas al cliente solo si ambas están disponibles
  if (coordinates.lat !== null && coordinates.lon !== null) {
    const newCoord = {
      lat: coordinates.lat,
      lon: coordinates.lon,
      timestamp: new Date().toISOString()
    };
    
    writeCoordinates(newCoord); // Guarda las coordenadas en el archivo JSON
    io.emit("coordinates", newCoord); // Envía las coordenadas completas al cliente
    // Reinicia las coordenadas para el siguiente conjunto de datos
    coordinates = { lat: null, lon: null };
  }
});

// Ruta para la página principal
app.get("/", (req, res) => {
  res.render("index");
});

// Ruta para obtener la última ubicación
app.get("/last-location", (req, res) => {
  if (fs.existsSync(lastCoordFilePath)) {
    const data = fs.readFileSync(lastCoordFilePath);
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: "No location data available" });
  }
});

// Ruta para obtener la ruta de las últimas X minutos
app.get("/route/:minutes", (req, res) => {
  const minutes = parseInt(req.params.minutes, 10);
  const filteredCoords = filterCoordinatesByTime(minutes);
  res.json(filteredCoords);
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
