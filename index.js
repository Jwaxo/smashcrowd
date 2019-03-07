
const socketio = require('socket.io');
const http = require('http');
const express = require('express');
const Twig = require('twig');

const config = require('config');

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

const app = express();
const server = http.Server(app);

const clientFactory = require('./src/smashdown-clientfactory.js');
const playerFactory = require('./src/smashdown-playerfactory.js');
const characterFactory = require('./src/smashdown-characterfactory.js');

const io = socketio(server);

const sassPaths = [
  'node_modules/foundation-sites/scss',
  'node_modules/motion-ui/src'
];

const port = 8080;
const chatHistory = [];
const clients = [];
let players = [];
let players_pick_order = [];
let currentPick = 0;
let currentRound = 1;
const console_colors = [ 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'gray', 'bgRed', 'bgGreen', 'bgYellow', 'bgBlue', 'bgMagenta', 'bgCyan', 'bgWhite'];

// Load characters from the character data file.
const charData = require('./lib/chars.json');

// Process characters.
const characters = [];

for (let i = 0; i < charData.chars.length; i++) {
  characters[i] = characterFactory.createCharacter(i, charData.chars[i]);
}

// Do basic server setup stuff.
app.use(express.static(__dirname + '/public'));

app.set("twig options", {
  allow_async: true,
  strict_variables: false
});

app.get('/', function(req, res) {
  res.render('index.twig', {
    characters,
    players_pick_order,
    currentRound,
    chatHistory,
  });
});

// Build the sass.
sass();

// Listen at the port.
server.listen(port, () => {
  console.log(`Listening on ${port}`);
});

/**
 * Handling of individual sockets as they remain connected.
 * Creates a Client to track the user at the socket, which is then used for all
 * received commands.
 */
io.on('connection', socket => {
  serverLog(`New connection established with hash ${socket.id}`, true);

  const randomColor = Math.floor(Math.random() * (console_colors.length));

  const client = clientFactory.createClient(socket);
  const clientId = clients.push(client);
  client.setId(clientId);
  client.setColor(chalk[console_colors[randomColor]]);

  serverLog(`${client.getLabel()} assigned to socket ${socket.id}`, true);

  // Generate everything just in case the connections existed before the server.
  setClientInfoSingle(socket, client);
  regeneratePlayers();
  regenerateCharacters();
  regenerateChatSingle(socket);

  // Set a default status for a connection if there are no players.
  if (!client.getPlayerId()) {
    if (players.length === 0) {
      setStatusSingle(client, 'Add a player in order to start drafting!');
    }
    else {
      setStatusSingle(client, 'Pick a player to draft.')
    }
  }

  /**
   * The client has created a player for the roster.
   *
   * Adds the player name to the list, assigns it an ID, and then sends the
   * command to all sockets to regenerate the player area.
   */
  socket.on('add-player', name => {
    serverLog(`${client.getLabel()} adding player ${name}`);
    const player = playerFactory.createPlayer(name);

    const playerId = players.push(player) - 1;
    players_pick_order.push(player);
    player.setId(playerId);

    if (playerId === 0) {
      player.setActive(true);
    }

    for (let i = 0; i < clients.length; i++) {
      if (!clients[i].getPlayerId()) {
        setStatusSingle(clients[i], 'Pick a player to draft.')
      }
    }

    regeneratePlayers();
  });

  /**
   * The client user picks which player they are currently representing.
   *
   * Adds the player to the client, the client to the player, and clears the info
   * from a prior player (if there was one), before regenerating player area.
   */
  socket.on('pick-player', playerId => {
    const player = players[playerId];
    const updatedPlayers = [];

    // First remove the current client's player so it's empty again.
    if (client.getPlayerId() !== null) {
      const prevPlayer = players[client.getPlayerId()];
      serverLog(`Removing ${client.getColor()(`Client ${client.getId()}`)} from player ${prevPlayer.getName()}`, true);
      prevPlayer.setClientId(0);
      client.setPlayer(null);

      updatedPlayers.push({
        'playerId': prevPlayer.getId(),
        'clientId': 0,
      });
    }
    serverLog(`${client.getLabel()} taking control of player ${player.getName()}`);
    player.setClientId(clientId);
    client.setPlayer(player);

    updatedPlayers.push({
      'playerId': player.getId(),
      'clientId': client.getId(),
      'roster_html': renderPlayerRoster(player),
    });

    setClientInfoSingle(socket, client);
    updatePlayersInfo(updatedPlayers);
  });

  /**
   * The client picks a character to add to their player's roster.
   *
   * Adds the character to the roster, removes the character from the total
   * character list, and advances the pick order.
   */
  socket.on('add-character', charId => {
    const playerId = client.getPlayerId();
    const character = characters[charId];
    if (playerId === null) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but does not have a player selected!`);
      setStatusSingle(client, 'You must select a player before you can pick a character!', 'warning');
    }
    else if (getActivePlayer().getId() !== playerId) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but it is not their turn.`);
      setStatusSingle(client, 'It is not yet your turn! Please wait.', 'alert');
    }
    else {
      // We can add the character!
      const player = players[playerId];
      serverLog(`${client.getLabel()} adding character ${character.getName()}.`);
      character.setPlayer(playerId);
      player.addCharacter(character);

      const characterUpdateData = [{
        'charId' : charId,
        'disabled': true,
      }];

      advanceDraft();
      updateCharacters(characterUpdateData);
    }
  });

  // Reset the entire game board, players, characters, and all.
  socket.on('reset', () => {
    serverLog(`${client.getLabel()} requested a server reset.`);
    resetAll();
  });

  // Be sure to remove the client from the list of clients when they disconnect.
  socket.on('disconnect', () => {
    const playerId = client.getPlayerId();
    let noPlayer = true;
    if (playerId !== null) {
      noPlayer = false;
      players[playerId].setClientId(0);
    }

    // If the client didn't have a player, don't bother announcing their
    // departure.
    serverLog(`${client.getLabel()} disconnected.`, noPlayer);
    client.setPlayer(null);

    regeneratePlayers();
  });
});

/**
 * Creates a simple message for displaying to the server, with timestamp.
 *
 * @param {string} message
 *   The message to set. This can have chalk.js formatting, which will be stripped
 *   prior to sending to clients.
 * @param {boolean} serverOnly
 *   If the message should not be broadcast in the clientside chat.
 */
function serverLog(message, serverOnly = false) {
  const date = new Date();
  const timestamp = date.toLocaleString("en-US");
  const log = `${timestamp}: ${message}`;

  if (!serverOnly) {
    updateChat(log);
  }

  console.log(log);
}

/**
 * Move to the next active player and do any additional processing.
 */
function advanceDraft() {

  const prevPlayer = getActivePlayer();
  const updatedPlayers = [];
  const newRound = (++currentPick % players.length === 0);

  // If players count goes evenly into current pick, we have reached a new round.
  if (newRound) {
    serverLog(`Round ${currentRound} completed.`);
    currentRound++;
    players_pick_order.reverse();
    currentPick = 0;
  }

  const currentPlayer = players_pick_order[currentPick];
  const currentClient = clients[currentPlayer.getClientId() - 1];

  // We only need to change active state if the player changes.
  if (prevPlayer !== currentPlayer) {
    prevPlayer.setActive(false);
    currentPlayer.setActive(true);

    updatedPlayers.push({
      'playerId': currentPlayer.getId(),
      'isActive': true,
    });
    setStatusSingle(currentClient, 'It is your turn! Please choose your next character.', 'primary');
  }

  updatedPlayers.push({
    'playerId': prevPlayer.getId(),
    'isActive': prevPlayer.isActive,
    'roster_html': renderPlayerRoster(prevPlayer),
  });

  // If we're at a new round we need to regenerate the player area entirely so
  // that they reorder. Otherwise just update stuff!
  if (newRound) {
    setStatusSingle(currentClient, 'With the new round, it is once again your turn! Choose wisely.', 'primary');
    regeneratePlayers();
  }
  else {
    updatePlayersInfo(updatedPlayers);
  }
}

/**
 * Figure out which player's turn it is to pick a character.
 *
 * Currently this is locked to "Snake" draft, where the turn order flips every
 * round.
 *
 * @returns Player
 *   The player that should pick their character next.
 */
function getActivePlayer() {
  let activePlayer = players[0];
  for (let i = 0; i < players.length; i++) {
    if (players[i].isActive) {
      activePlayer = players[i];
      break;
    }
  }
  return activePlayer;
}

/**
 * Set all options back to defaults.
 */
function resetAll() {

  players = [];
  players_pick_order = [];
  currentRound = 1;
  currentPick = 0;
  for (let i = 0 ; i < characters.length; i++) {
    characters[i].setPlayer(null);
  }
  for (let i = 0; i < clients.length; i++) {
    clients[i].setPlayer(null);
    setClientInfoSingle(clients[i].getSocket(), clients[i]);
    serverLog(`Wiping player info for ${clients[i].getLabel()}`);
  }

  regeneratePlayers();
  regenerateCharacters();
}

function renderPlayerRoster(player) {
  let rendered = '';

  Twig.renderFile('./views/player-roster.twig', {player}, (error, html) => {
    rendered = html;
  });

  return rendered;
}

function regeneratePlayers() {
  Twig.renderFile('./views/players-container.twig', {players_pick_order, currentRound}, (error, html) => {
    io.sockets.emit('rebuild-players', html);
  });
}

function regenerateCharacters() {
  Twig.renderFile('./views/characters-container.twig', {characters}, (error, html) => {
    io.sockets.emit('rebuild-characters', html);
  });
}

function regenerateChatSingle(socket) {
  Twig.renderFile('./views/chat-container.twig', {chatHistory}, (error, html) => {
    socket.emit('rebuild-chat', html);
  });
}

function setClientInfoSingle(socket, client) {
  // Socket connections can't hold themselves, so we need to remove the socket
  // info from the client before sending it.

  let safeClient = {};

  // Note that the cloned client also has no functions, only properties. It is,
  // essentially, static.
  Object.assign(safeClient, client);
  safeClient.socket = null;

  socket.emit('set-client', safeClient);
}

/**
 * Sends an array of players with changed data to inform clients without needing
 * to completely rebuild the player area.
 *
 * @param {array} players
 */
function updatePlayersInfo(players) {
  io.sockets.emit('update-players', players);
}

/**
 * Sends an array of characters with changed data to inform clients without needing
 * to completely rebuild the character area.
 *
 * @param {array} characters
 */
function updateCharacters(characters) {
  io.sockets.emit('update-characters', characters);
}

function setStatusSingle(client, status, type = 'secondary') {
  if (client && client.socket) {
    Twig.renderFile('./views/status-message.twig', {status, type}, (error, html) => {
      client.socket.emit('set-status', html);
    });
  }
}

/**
 * Adds a new line item to the chat box.
 *
 * @param {string} message
 *   The message to add. This is expected to be formatted using chalk.js for
 *   console formatting; it will be stripped.
 */
function updateChat(message) {
  // Define how console colors look so we can remove them from the HTML.
  message = stripAnsi(message);

  chatHistory.unshift(message);

  Twig.renderFile('./views/chat-item.twig', {message}, (error, html) => {
    io.sockets.emit('update-chat', html);
  });
}

/**
 * Build out the Sass located in scss/app.scss. Outputs to public/css.
 */
function sass() {
  return gulp.src('scss/app.scss')
    .pipe($.sass({
      includePaths: sassPaths,
      outputStyle: 'compressed' // if css compressed **file size**
    })
      .on('error', $.sass.logError))
    .pipe($.postcss([
      autoprefixer({ browsers: ['last 2 versions', 'ie >= 9'] })
    ]))
    .pipe(gulp.dest('public/css'))
}
