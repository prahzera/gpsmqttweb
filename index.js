const express = require("express"); // Importa el módulo Express para crear un servidor web
const path = require("path"); // Importa el módulo Path para manejar rutas de archivos y directorios
const mqtt = require("mqtt"); // Importa el módulo MQTT para conectarse a un servidor MQTT
const http = require("http"); // Importa el módulo HTTP para crear un servidor HTTP
const socketIo = require("socket.io"); // Importa el módulo Socket.IO para la comunicación en tiempo real
const fs = require("fs"); // Importa el módulo FS para manejar operaciones de archivos
const session = require('express-session');

const app = express(); // Crea una aplicación Express
const server = http.createServer(app); // Crea un servidor HTTP utilizando Express
const io = socketIo(server); // Asocia Socket.IO con el servidor HTTP

app.use(session({
  secret: 'ickki2p2',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Cambia a true si usas HTTPS
}));

const port = 3000; // Define el puerto en el que el servidor escuchará las conexiones

// Configura EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Define la ruta a las vistas EJS

// Servir archivos estáticos desde el directorio "public"
app.use(express.static(path.join(__dirname, "public")));

// Configuración para analizar datos del formulario
app.use(express.urlencoded({ extended: true }));

// Configuración de la conexión MQTT
const options = {
  username: 'ArthurRios', // Nombre de usuario para la conexión MQTT
  password: 'arthuralex99', // Contraseña para la conexión MQTT
};

// Conéctate al servidor MQTT
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com', options);

let coordinates = { lat: null, lon: null }; // Variable para almacenar las coordenadas actuales

// Ruta al archivo JSON donde se almacenarán las coordenadas
const dataFilePath = path.join(__dirname, "coordinates.json");
const lastCoordFilePath = path.join(__dirname, "lastCoordinate.json");

// Función para leer las coordenadas almacenadas desde el archivo JSON
const readCoordinates = () => {
  if (fs.existsSync(dataFilePath)) { // Verifica si el archivo existe
    const data = fs.readFileSync(dataFilePath); // Lee el archivo JSON
    return JSON.parse(data); // Retorna las coordenadas como un objeto JSON
  }
  return []; // Retorna un arreglo vacío si no hay datos
};

// Función para escribir nuevas coordenadas en el archivo JSON
const writeCoordinates = (newCoord) => {
  const coords = readCoordinates(); // Lee las coordenadas actuales
  coords.push(newCoord); // Agrega las nuevas coordenadas al arreglo
  fs.writeFileSync(dataFilePath, JSON.stringify(coords, null, 2)); // Escribe el archivo JSON actualizado

  // Actualiza el archivo de la última coordenada
  fs.writeFileSync(lastCoordFilePath, JSON.stringify(newCoord, null, 2));
};

// Función para filtrar coordenadas por tiempo (últimos X minutos)
const filterCoordinatesByTime = (minutes) => {
  const coords = readCoordinates(); // Lee todas las coordenadas
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000); // Calcula el tiempo límite para el filtro

  return coords.filter(coord => new Date(coord.timestamp) >= cutoffTime); // Retorna solo las coordenadas dentro del tiempo especificado
};

// Función para validar coordenadas (descartar aquellas que tienen valor 0)
const isValidCoordinate = (coord) => {
  return coord.lat !== 0 && coord.lon !== 0;
};

// Conexión al servidor MQTT y manejo de mensajes
mqttClient.on("connect", () => {
  console.log("Conectado al servidor MQTT");
  mqttClient.subscribe(["longps/perro1", "latgps/perro1"], (err) => { // Se suscribe a los temas de longitud y latitud
    if (!err) {
      console.log("Suscrito a los temas longps/perro1 y latgps/perro1");
    } else {
      console.error("Error al suscribirse a los temas:", err);
    }
  });
});

mqttClient.on("message", (topic, message) => {
  // Manejo de mensajes recibidos por MQTT
  if (topic === "longps/perro1") {
    coordinates.lon = parseFloat(message.toString()); // Almacena la longitud
  } else if (topic === "latgps/perro1") {
    coordinates.lat = parseFloat(message.toString()); // Almacena la latitud
  }

  // Si ambas coordenadas están disponibles y son válidas, se procesan
  if (coordinates.lat !== null && coordinates.lon !== null && isValidCoordinate(coordinates)) {
    const newCoord = {
      lat: coordinates.lat, // Latitud
      lon: coordinates.lon, // Longitud
      timestamp: new Date().toISOString() // Marca de tiempo
    };

    writeCoordinates(newCoord); // Guarda las coordenadas en el archivo JSON
    io.emit("coordinates", newCoord); // Envía las coordenadas completas al cliente vía Socket.IO
    coordinates = { lat: null, lon: null }; // Reinicia las coordenadas para el siguiente conjunto de datos
  }
});

// Función para calcular la distancia entre dos coordenadas usando la fórmula de Haversine
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Función para calcular distancias totales, diarias y mensuales
const calculateDistances = (coords) => {
  let totalDistance = 0; // Variable para la distancia total
  let dailyDistances = {}; // Objeto para almacenar distancias diarias
  let monthlyDistances = {}; // Objeto para almacenar distancias mensuales

  coords.forEach((coord, index) => {
    if (index > 0) {
      const prevCoord = coords[index - 1];
      const distance = haversineDistance(
        prevCoord.lat,
        prevCoord.lon,
        coord.lat,
        coord.lon
      );
      totalDistance += distance; // Suma la distancia al total

      // Calcula las distancias por día y por mes
      const date = new Date(coord.timestamp);
      const day = date.toISOString().split('T')[0];
      const month = date.getFullYear() + '-' + (date.getMonth() + 1);

      if (!dailyDistances[day]) dailyDistances[day] = 0;
      dailyDistances[day] += distance;

      if (!monthlyDistances[month]) monthlyDistances[month] = 0;
      monthlyDistances[month] += distance;
    }
  });

  return {
    totalDistance,
    dailyDistances,
    monthlyDistances
  };
};

// Middleware para verificar si el usuario está autenticado
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next(); // El usuario está autenticado, continúa a la siguiente ruta
  } else {
    res.redirect('/login'); // Redirige al login si no está autenticado
  }
};

// Protege la ruta principal con el middleware de autenticación
app.get('/', requireAuth, (req, res) => {
  const coordinates = readCoordinates();
  const { totalDistance, dailyDistances, monthlyDistances } = calculateDistances(coordinates);
  res.render('index', {
    totalDistance,
    dailyDistances,
    monthlyDistances
  });
});

// Ruta para obtener la última ubicación
app.get("/last-location", (req, res) => {
  if (fs.existsSync(lastCoordFilePath)) { // Verifica si existe el archivo con la última coordenada
    const data = fs.readFileSync(lastCoordFilePath); // Lee el archivo
    res.json(JSON.parse(data)); // Envía los datos como JSON
  } else {
    res.status(404).json({ error: "No location data available" }); // Envía un error si no hay datos disponibles
  }
});

// Ruta para obtener la ruta de las últimas X minutos
app.get("/route/:minutes", (req, res) => {
  const minutes = parseInt(req.params.minutes, 10); // Convierte el parámetro a número entero
  const filteredCoords = filterCoordinatesByTime(minutes); // Filtra las coordenadas por el tiempo especificado
  res.json(filteredCoords); // Envía las coordenadas filtradas como JSON
});


// Define la ruta al archivo profiles.json
const profilesFilePath = path.join(__dirname, 'profiles.json');

// Función para leer perfiles desde el archivo profiles.json
const readProfiles = () => {
  if (fs.existsSync(profilesFilePath)) { // Verifica si el archivo existe
    const data = fs.readFileSync(profilesFilePath); // Lee el archivo
    return JSON.parse(data); // Devuelve los perfiles como un objeto JSON
  }
  return {}; // Devuelve un objeto vacío si el archivo no existe
};

const profiles = readProfiles(); // Lee los perfiles al inicio
console.log('Perfiles cargados:', profiles); // Agrega este log para verificar el contenido del archivo

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/'); // Redirige si ya está autenticado
  }
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body; // Extrae el nombre de usuario y contraseña del formulario

  console.log('Intento de inicio de sesión:', { username, password }); // Agrega este log para verificar los datos enviados

  if (profiles[username] && profiles[username].contraseña === password) {
    req.session.user = username; // Guarda el usuario en la sesión
    console.log('Inicio de sesión exitoso para:', username); // Agrega este log para confirmar el inicio de sesión
    res.redirect('/'); // Redirige al usuario a la página principal
  } else {
    console.log('Credenciales incorrectas para:', username); // Agrega este log para errores de inicio de sesión
    res.redirect('/login'); // Redirige al login si las credenciales son incorrectas
  }
});


// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Could not log out.');
    }
    res.redirect('/login');
  });
});


const ACCESS_TOKEN = 'D2YW3PZVYDMB6M14ZM8IS7MXYEXO5DA8'

app.get('/coordinates', async (req, res) => {
  const token = req.query.token; // Obtiene el token de los parámetros de consulta

  // Verifica si el token es válido
  if (token === ACCESS_TOKEN) {
    // Envía el archivo coordinates.json si el token es válido
    res.sendFile(dataFilePath);
  } else {
    // Devuelve un error 403 si el token es inválido
    res.status(403).json({ error: 'Token inválido' });
  }
});

// Inicia el servidor y lo pone a escuchar en el puerto especificado
server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
