/* eslint-disable no-console */
const path = require('path');
const _ = require('lodash');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const history = require('connect-history-api-fallback');

const app = express();
const server = http.Server(app);
const io = socketio(server);

const characters = require('./lib/chars').chars;

const PORT = 3000;

// Express serving static, built version of Vue app
const staticMiddleware = express.static(path.join(__dirname, 'dist'));
app.use(staticMiddleware);
app.use(history());
app.use(staticMiddleware);
// `app.use(staticMiddleware)` is included twice per:
// https://github.com/bripkens/connect-history-api-fallback/blob/master/examples/static-files-and-index-rewrite/README.md#configuring-the-middleware

server.listen(PORT, function() {
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
        activePlayer: '',
        draftStarted: false,
        players: [],
        characters,
      };
    }
    // Join and emit back to current socket the room state
    socket.join(room).emit('ROOM_STATE', state[room]);
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
  socket.on('PLAYERS_SHUFFLE', ({ room }) => {
    state[room].players = _.shuffle(state[room].players);

    io.sockets.in(room).emit('ROOM_STATE', state[room]);
  });
  /**
   * Wipe all players
   */
  socket.on('ROOM_RESET', ({ room }) => {
    state[room].players = [];
    state[room].draftStarted = false;
    state[room].characters = characters;

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
  /**
   *
   * Add char to player
   */
  socket.on('PLAYER_ADD_CHARACTER', ({ room, payload }) => {
    const { charName, playerName } = payload;
    const characters = state[room].characters;

    // Find char
    const char = characters.find(({ name }) => name === charName);
    // Add char to player
    state[room].players
      .find(({ name }) => name === playerName)
      .characters.push(char);
    // Overwrite characters, removing selected char
    state[room].characters = characters.filter(({ name }) => name !== charName);

    // Set next active player
    const playerIndex = state[room].players.findIndex(
      ({ name }) => name === state[room].activePlayer
    );
    // If last in array
    state[room].activePlayer =
      playerIndex === state[room].players.length - 1
        ? // then jump to first player
          state[room].players[0].name
        : // otherwise next index in array
          state[room].players[playerIndex + 1].name;

    io.sockets.in(room).emit('ROOM_STATE', state[room]);
  });
});
