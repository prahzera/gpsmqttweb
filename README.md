# 🐾 Aplicación Web de Rastreo GPS

¡Bienvenido a la **Aplicación Web de Rastreo GPS**! Este proyecto es una aplicación web en tiempo real diseñada para rastrear la ubicación de entidades, como mascotas, utilizando datos GPS transmitidos a través de MQTT. La aplicación presenta un mapa en vivo, resúmenes de distancia y la capacidad de ver rutas históricas en varios intervalos de tiempo.

## 📋 Índice

- [Características](#-características)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Contribuciones](#-contribuciones)
- [Licencia](#-licencia)

## 🚀 Características

- **Mapa en Vivo**: Visualiza la ubicación en tiempo real de la entidad rastreada en un mapa interactivo.
- **Resúmenes de Distancia**: Muestra la distancia recorrida en diferentes intervalos de tiempo (hoy, esta semana, este mes).
- **Historial de Rutas**: Consulta rutas históricas seleccionando diferentes intervalos de tiempo.
- **Notificaciones en Tiempo Real**: Recibe actualizaciones en tiempo real de las coordenadas GPS a través de WebSockets.
- **Interfaz Adaptativa**: Totalmente responsive, adaptándose a cualquier tamaño de pantalla, desde dispositivos móviles hasta escritorios.

## 🛠️ Tecnologías Utilizadas

- **Node.js**: Entorno de ejecución para el backend.
- **Express.js**: Framework web para manejar rutas y servir contenido estático.
- **MQTT.js**: Cliente MQTT para recibir datos de ubicación.
- **Socket.io**: Comunicación en tiempo real entre el servidor y el cliente.
- **Leaflet.js**: Biblioteca JavaScript para la visualización de mapas interactivos.
- **EJS**: Motor de plantillas para generar HTML dinámico.
- **CSS**: Estilos personalizados para una interfaz atractiva y funcional.

## 💻 Instalación y Configuración

Sigue estos pasos para configurar el proyecto en tu entorno local:

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/rastreo-gps.git
   cd rastreo-gps
2. **Instala las dependencias:**
   ```bash
   npm install
3. **Configura las credenciales MQTT:**
    - Abre index.js y configura el username y password en el objeto options para conectarte al servidor MQTT.
      
4. **Inicia la aplicación**
   ```bash
   node .
6. **Accede a la aplicación en tu navegador:**
   http://localhost:3000


## 🕹️ Uso

1. **Visualización de Mapas**: Al acceder a la aplicación, verás un mapa con la ubicación actual de la entidad rastreada.
2. **Historial de Rutas**: Selecciona un intervalo de tiempo desde el menú desplegable para ver las rutas históricas en el mapa.
3. **Resumen de Distancias**: En la parte inferior del mapa, se muestran las distancias recorridas hoy, esta semana y este mes.


## 📂 Estructura del Proyecto

- `/public`: Archivos estáticos como CSS, imágenes y JavaScript.
- `/views`: Plantillas EJS utilizadas para generar HTML.
- `/coordinates.json`: Archivo JSON donde se almacenan las coordenadas GPS.
- `/lastCoordinate.json`: Archivo JSON donde se guarda la última coordenada recibida.
- `index.js`: Archivo principal del servidor que maneja la lógica del backend y la conexión MQTT.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si deseas mejorar este proyecto, por favor sigue estos pasos:

1. Haz un fork del repositorio.
2. Crea una rama con tu nueva característica (`git checkout -b nueva-caracteristica`).
3. Realiza un commit con tus cambios (`git commit -m 'Agrega nueva característica'`).
4. Envía los cambios a tu repositorio (`git push origin nueva-caracteristica`).
5. Abre un Pull Request para que revisemos tu aporte.


## 📜 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

¡Gracias por usar la Aplicación Web de Rastreo GPS! Si tienes alguna pregunta o sugerencia, no dudes en contactarme.
