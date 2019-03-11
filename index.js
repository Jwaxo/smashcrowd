
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
const boardFactory = require('./src/smashdown-boardfactory.js');

const io = socketio(server);

const sassPaths = [
  'node_modules/foundation-sites/scss',
  'node_modules/motion-ui/src'
];

const port = 8080;
const chatHistory = [];
const clients = [];
const console_colors = [ 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'gray', 'bgRed', 'bgGreen', 'bgYellow', 'bgBlue', 'bgMagenta', 'bgCyan', 'bgWhite'];
// Currently we only run one board at a time, so set the ID to 1.
const board = boardFactory.createBoard(1, {'draftType': 'snake'});

// Load characters from the character data file.
const charData = require('./lib/chars.json');

// Process characters.
for (let i = 0; i < charData.chars.length; i++) {
  board.addCharacter(characterFactory.createCharacter(i, charData.chars[i]));
}

// Do basic server setup stuff.
app.use(express.static(__dirname + '/public'));

app.set("twig options", {
  allow_async: true,
  strict_variables: false
});

app.get('/', function(req, res) {
  res.render('index.twig', {
    board,
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
  setClientInfoSingle(client);
  regeneratePlayers();
  regenerateCharacters();
  regenerateChatSingle(socket);

  // Set a default status for a connection if there are no players.
  if (!client.getPlayerId()) {
    if (board.getPlayersCount() === 0) {
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

    const playerId = board.addPlayer(player);
    player.setId(playerId);

    clients.forEach(client => {
      if (!client.getPlayerId()) {
        setStatusSingle(client, 'Pick a player to draft.');
      }
    });

    regeneratePlayers();
  });

  /**
   * The client user picks which player they are currently representing.
   *
   * Adds the player to the client, the client to the player, and clears the info
   * from a prior player (if there was one), before regenerating player area.
   */
  socket.on('pick-player', playerId => {
    const player = board.getPlayerById(playerId);
    const updatedPlayers = [];

    // First remove the current client's player so it's empty again.
    if (client.getPlayerId() !== null) {
      const prevPlayer = client.getPlayer();
      serverLog(`Removing ${client.getColor()(`Client ${client.getId()}`)} from player ${prevPlayer.getName()}`, true);
      client.setPlayer(null);

      updatedPlayers.push({
        'playerId': prevPlayer.getId(),
        'clientId': 0,
      });
    }
    serverLog(`${client.getLabel()} taking control of player ${player.getName()}`);
    client.setPlayer(player);

    updatedPlayers.push({
      'playerId': player.getId(),
      'clientId': client.getId(),
      'roster_html': renderPlayerRoster(player),
    });

    setClientInfoSingle(client);
    updatePlayersInfo(updatedPlayers);
  });

  /**
   * The client picks a character to add to their player's roster.
   *
   * Adds the character to the roster, removes the character from the total
   * character list, and advances the pick order.
   */
  socket.on('add-character', charId => {
    const player = client.getPlayer();
    const character = board.getCharacter(charId);

    if (board.getDraftRound() < 1) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but drafting has not started.`);
      setStatusSingle(client, 'You must select a player before you can pick a character!', 'warning');
    }
    if (player === null) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but does not have a player selected!`);
      setStatusSingle(client, 'You must select a player before you can pick a character!', 'warning');
    }
    else if (!player.isActive) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but it is not their turn.`);
      setStatusSingle(client, 'It is not yet your turn! Please wait.', 'alert');
    }
    else {
      // We can add the character!
      serverLog(`${client.getLabel()} adding character ${character.getName()}.`);
      character.setPlayer(player.getId());
      player.addCharacter(character);

      const characterUpdateData = [{
        'charId' : charId,
        'disabled': true,
      }];

      advanceDraft();
      updateCharacters(characterUpdateData);
    }
  });

  socket.on('start-draft', () => {
    serverLog(`${client.getLabel()} started the draft.`);
    board.advanceDraftRound();
    board.getPlayerByPickOrder(0).setActive(true);
    regenerateBoardInfo();
    regenerateCharacters();
    regeneratePlayers();
    setStatusAll('The draft has begun!', 'success');
  });

  // Reset the entire game board, players, characters, and all.
  socket.on('reset', data => {
    serverLog(`${client.getLabel()} requested a server reset.`);
    resetAll(data);
  });

  // Shuffles the players to a random order.
  socket.on('players-shuffle', () => {
    serverLog(`${client.getLabel()} shuffled the players.`);

    board.shufflePlayers();

    setStatusSingle(client, 'Players shuffled!');

    regeneratePlayers();
  });

  // Be sure to remove the client from the list of clients when they disconnect.
  socket.on('disconnect', () => {
    const player = client.getPlayer();
    let noPlayer = true;
    if (player !== null) {
      noPlayer = false;
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

  const prevPlayer = board.getActivePlayer();
  const updatedPlayers = [];

  if (board.getDraftRound() === 1 && board.getPick() === 0) {
    // If this is the first pick of the game, tell clients so that we can update
    // the interface.
    io.sockets.emit('setup-complete');
    setStatusAll('Character drafting has begun!', 'success');
  }

  // This boolean tells us if the most recent pick ended the round.
  const newRound = (board.advancePick() % board.getPlayersCount() === 0);

  // If players count goes evenly into current pick, we have reached a new round.
  if (newRound) {
    serverLog(`Round ${board.getDraftRound()} completed.`);
    board.advanceDraftRound();
    board.reversePlayersPick();
    board.resetPick();
  }

  const currentPlayer = board.getPlayerByPickOrder(board.getPick());
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
    regenerateBoardInfo();
    regeneratePlayers();
  }
  else {
    updatePlayersInfo(updatedPlayers);
  }
}

/**
 * Set all options back to defaults.
 */
function resetAll(boardData) {

  // Currently players get erased when we reset the board, since we don't have a
  // way to remove a single player. Eventually we should reset this by just running
  // resetPlayers().
  board.dropAllPlayers();
  board.resetCharacters();
  board.resetDraftRound();
  board.resetPick();

  if (boardData.draftType) {
    board.setDraftType(boardData.draftType);
  }
  if (boardData.totalRounds) {
    board.setTotalRounds(boardData.totalRounds);
  }

  clients.forEach(client => {
    client.setPlayer(null);
    setClientInfoSingle(client);
    serverLog(`Wiping player info for ${client.getLabel()}`);
  });

  regenerateBoardInfo();
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

function regenerateBoardInfo() {
  Twig.renderFile('./views/board-data.twig', {board}, (error, html) => {
    io.sockets.emit('rebuild-boardInfo', html);
  });
}

function regeneratePlayers() {
  // The player listing is unique to each client, so we need to rebuild it and
  // send it out individually.
  clients.forEach(client => {
    Twig.renderFile('./views/players-container.twig', {board, client}, (error, html) => {
      client.getSocket().emit('rebuild-players', html);
    });
  });
}

function regenerateCharacters() {
  Twig.renderFile('./views/characters-container.twig', {board}, (error, html) => {
    io.sockets.emit('rebuild-characters', html);
  });
}

function regenerateChatSingle(socket) {
  Twig.renderFile('./views/chat-container.twig', {chatHistory}, (error, html) => {
    socket.emit('rebuild-chat', html);
  });
}

function setClientInfoSingle(socketClient) {
  const client = cleanClient(socketClient);
  // Make sure to clean client before sending it.
  socketClient.getSocket().emit('set-client', client);
}

/**
 * Sends an array of players with changed data to inform clients without needing
 * to completely rebuild the player area.
 *
 * @param {Array} players
 */
function updatePlayersInfo(players) {
  io.sockets.emit('update-players', players);
}

/**
 * Sends an array of characters with changed data to inform clients without needing
 * to completely rebuild the character area.
 *
 * @param {Array} characters
 */
function updateCharacters(characters) {
  io.sockets.emit('update-characters', characters);
}

/**
 * Sends a status message to all users.
 *
 * @param {string} status
 *   The message to send.
 * @param {string} type
 *   The type of message. Uses Foundation's callout styles: https://foundation.zurb.com/sites/docs/callout.html
 */
function setStatusAll(status, type = 'secondary') {
  Twig.renderFile('./views/status-message.twig', {status, type}, (error, html) => {
    io.sockets.emit('set-status', html);
  });
}

/**
 * Sends a status message to a single user.
 *
 * @param {Client} client
 *   The client object to target.
 * @param {string} status
 *   The message to send.
 * @param {string} type
 *   The type of message. Uses Foundation's callout styles: https://foundation.zurb.com/sites/docs/callout.html
 */
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
 * Removes socket from Client objects without updating the actual object via ref.
 *
 * Socket connections can't hold themselves, so we need to remove the socket
 * info from the client before sending it.
 *
 * Note that the cloned client also has no functions, only properties. It is,
 * essentially, static.
 * @param client
 * @returns {{}}
 */
function cleanClient(client) {
  let safeClient = {};

  Object.assign(safeClient, client);
  safeClient.socket = null;

  return safeClient;
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
