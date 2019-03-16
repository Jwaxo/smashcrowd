const _ = require('lodash');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketio(server);

const PORT = 3000;

// Express stuff
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});
server.listen(PORT, function(){
  console.log(`Listening on *:${PORT}`);
});

const state = {};

// Socket stuff
io.sockets.on('connection', socket => {
  console.log('User has connected');

  /**
   * Unique urls are "rooms" on our state
   */
  socket.on('ROOM_JOIN', ({ room }) => {
    // Create room if joining first time
    if (!state[room]) {
      state[room] = {
        players: [],
        draftStarted: false,
        activePlayer: '',
      };
    }
    // Join and emit back to current socket the room state
    socket
      .join(room)
      .emit('ROOM_STATE', state[room]);
  });
  /**
   * Add player and inform everyone
   */
  socket.on('PLAYER_ADD', ({ room, payload: playerName }) => {
    // Add player with starting shape
    state[room].players.push({
      name: playerName,
      characters: [],
    });
    // Also set active for time being
    state[room].activePlayer = playerName;

    io.sockets.in(room).emit('ROOM_STATE', state[room]);
  });
  /**
   * Shuffle players and inform everyone
   */
  socket.on('PLAYERS_SHUFFLE', ({room}) => {
    state[room].players = _.shuffle(state[room].players);

    io.sockets.in(room).emit('ROOM_STATE', state[room]);
  });
  /**
   * Wipe all players
   */
  socket.on('ROOM_RESET', ({ room }) => {
    state[room].players = [];
    state[room].draftStarted = false;

    io.sockets.in(room).emit('ROOM_STATE', state[room]);
  });
  /**
   * Start draft
   */
  socket.on('DRAFT_START', ({ room }) => {
    state[room].draftStarted = true;
    state[room].activePlayer = state[room].players[0].name;

    io.sockets.in(room).emit('ROOM_STATE', state[room]);
  });
});
