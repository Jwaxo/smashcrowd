
const socketio = require('socket.io');
const http = require('http');
const express = require('express');

const app = express();
const server = http.Server(app);
const io = socketio(server);

const hostname = '127.0.0.1';
const port = 8080;
const chatHistory = [];
const clients = [];
const colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange', ];

// Do basic server setup stuff.

app.use(express.static(__dirname + '/public'));

server.listen(port, () => {
  console.log(`Listening on ${port}`);
});

io.on('connection', socket => {
  serverLog(`New connection established with ID ${socket.id}`);
  const clientInfo = new Client(socket);
  const clientId = clients.push(clientInfo);
  serverLog(`Client ${clientId} assigned color ${clientInfo.color}`);
});

function serverLog(message) {
  const date = new Date();
  const timestamp = date.toLocaleString("en-US");
  console.log(`${timestamp}: ${message}`);
}

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

class Client {
  constructor(socket) {
    this.socket = socket;
    this.color = colors[0];// Setting to Red by default for now.

    return this;
  }
}
