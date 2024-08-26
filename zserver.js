const aedes = require('aedes')();
const server = require('net').createServer(aedes.handle);
const port = 1883;

server.listen(port, function () {
  console.log(`Servidor MQTT escuchando en el puerto ${port}`);
});

aedes.on('client', function (client) {
  console.log('Cliente conectado:', client.id);
});

aedes.on('publish', function (packet, client) {
  console.log('Mensaje publicado en el tema', packet.topic, ':', packet.payload.toString());
});

aedes.on('subscribe', function (subscriptions, client) {
  console.log('Cliente suscrito a:', subscriptions.map(s => s.topic).join(', '));
});

aedes.on('unsubscribe', function (subscriptions, client) {
  console.log('Cliente desuscrito de:', subscriptions.join(', '));
});
