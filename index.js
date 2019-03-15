
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

const Client = require('./src/smashdown-clientfactory.js');
const Player = require('./src/smashdown-playerfactory.js');
const Character = require('./src/smashdown-characterfactory.js');
const Board = require('./src/smashdown-boardfactory.js');

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
const board = new Board(1, {'draftType': 'snake'});

// Load characters from the character data file.
const charData = require('./lib/chars.json');

// Process characters.
for (let i = 0; i < charData.chars.length; i++) {
  board.addCharacter(new Character(i, charData.chars[i]));
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

  const client = new Client(socket);
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
    const player = new Player(name);

    board.addPlayer(player);

    if (!client.getPlayer()) {
      // If the client doesn't yet have a player, assume they want this one for
      // now.
      serverLog(`${client.getLabel()} automatically taking control of player ${player.getName()}`);
      client.setPlayer(player);
    }

    clients.forEach(client => {
      if (!client.getPlayerId()) {
        setStatusSingle(client, 'Pick a player to draft.');
      }
    });

    regeneratePlayers(false);
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
    const character = board.getDraftType() !== 'free' ? board.getCharacter(charId) : new Character(charId, charData.chars[charId]);

    if (board.getDraftRound() < 1) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but drafting has not started.`);
      setStatusSingle(client, 'You must select a player before you can pick a character!', 'warning');
    }
    if (player === null) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but does not have a player selected!`);
      setStatusSingle(client, 'You must select a player before you can pick a character!', 'warning');
    }
    else if (board.getDraftType() !== 'free' && !player.isActive) {
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but it is not their turn.`);
      setStatusSingle(client, 'It is not yet your turn! Please wait.', 'alert');
    }
    else if (board.getDraftType() === 'free' && !player.isActive) {
      // @todo: for some reason this does not trigger in free draft.
      serverLog(`${client.getLabel()} tried to add ${character.getName()} but has already added maximum characters!`);
      setStatusSingle(client, 'You have reached the maximum number of characters!', 'alert');
    }
    else {
      // We can add the character!
      serverLog(`${client.getLabel()} adding character ${character.getName()}.`);

      player.addCharacter(character);

      if (board.getDraftType() === 'free') {
        advanceFreePick(player);
      }
      else {
        character.setPlayer(player.getId());

        updateCharacters([
          {
            'charId' : charId,
            'disabled': true,
          }
        ]);
        advanceDraft();
      }
    }
  });

  socket.on('player-character-click', (charId, charRound, playerId) => {
    // We need to do different things depending upon the state of the board and
    // what type of draft we're running.
    const clientPlayer = client.getPlayer();
    const clickedPlayer = board.getPlayerById(playerId);
    const character_index = charRound - 1;

    // The user is marking a winner of a round.
    if (board.getGameRound() === charRound) {
      clickedPlayer.addStat('game_score');
      clickedPlayer.setCharacterState(character_index, 'win');
      board.players.forEach(eachPlayer => {
        if (eachPlayer.getId() !== playerId) {
          eachPlayer.addStat('lost_rounds');
          eachPlayer.setCharacterState(character_index, 'loss');
        }
      });
      advanceGame();
    }
    // The user is removing a character from their roster.
    else if (board.getDraftType() === 'free' && clientPlayer.getId() === playerId) {
      // @todo: this appeared to not be working anymore. Maybe related to the non-unique character?
      clientPlayer.dropCharacter(character_index);
      // If the draft was marked complete, uncomplete it!
      if (board.getStatus() === 'draft-complete') {
        board.setStatus('draft');
        regenerateBoardInfo();
      }

      regeneratePlayers();
    }
  });

  socket.on('start-draft', () => {
    serverLog(`${client.getLabel()} started the draft.`);
    board.advanceDraftRound();

    if (board.getDraftType() === 'free') {
      const players = board.getPlayers();
      for (let i = 0; i < players.length; i++) {
        players[i].setActive(true);
      }
    }
    else {
      board.getPlayerByPickOrder(0).setActive(true);
    }

    regenerateBoardInfo();
    regenerateCharacters();
    regeneratePlayers();
    setStatusAll('The draft has begun!', 'success');
  });

  socket.on('start-game', () => {
    serverLog(`${client.getLabel()} started the game.`);
    board.getActivePlayer().setActive(false);
    advanceGame();

    // We only need to regenerate characters on game start, not every round,
    // since we want to hide them.
    regenerateCharacters();

    setStatusAll('The game has begun!', 'success');
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
 * Since free pick doesn't have a nice, easy draft count of rounds, we need to
 * track how many characters each player has added, and update the board info/
 * state if they've all picked.
 *
 * @params {Player} player
 *  The player that just picked.
 */
function advanceFreePick(player) {
  const updatedPlayers = [];
  const players = board.getPlayers();
  let draftComplete = true;

  updatedPlayers.push({
    'playerId': player.getId(),
    'roster_html': renderPlayerRoster(player),
    'isActive': (!board.getTotalRounds() || player.getCharacterCount() < board.getTotalRounds()),
  });

  updatePlayersInfo(updatedPlayers);

  // If a single player is not yet ready, don't update the board.
  for (let i = 0; i < players.length; i++) {
    if (players[i].getCharacterCount() < board.getTotalRounds()) {
      draftComplete = false;

      break;
    }
  }

  if (draftComplete) {
    board.setStatus('draft-complete');
    regenerateBoardInfo();
  }
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
    setStatusAll('Character drafting has begun!', 'success');
  }

  // This boolean tells us if the most recent pick ended the round.
  const newRound = (board.advancePick() % board.getPlayersCount() === 0);

  // If players count goes evenly into current pick, we have reached a new round.
  if (newRound && board.getDraftRound() === board.getTotalRounds()) {
    serverLog(`Drafting is now complete!`);
    io.sockets.emit('draft-complete');
    board.getActivePlayer().setActive(false);
    board.setStatus('draft-complete');
    regenerateBoardInfo();
    regeneratePlayers();
    regenerateCharacters();
  }
  else {
    // On with the draft!
    if (newRound) {
      serverLog(`Round ${board.getDraftRound()} completed.`);
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

    // @todo: somewhere around here in snake draft, if the first player was automatically assigned, they do not see their first character.

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
}

function advanceGame() {
  const round = board.advanceGameRound();

  // Go through all players and update their rosters.
  regeneratePlayers();
  regenerateBoardInfo();
}

/**
 * Set all options back to defaults.
 */
function resetAll(boardData) {
  board.resetAll();

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

  Twig.renderFile('./views/player-roster.twig', {player, board}, (error, html) => {
    rendered = html;
  });

  return rendered;
}

function regenerateBoardInfo() {
  Twig.renderFile('./views/board-data.twig', {board}, (error, html) => {
    io.sockets.emit('rebuild-boardInfo', html);
  });
}

function regeneratePlayers(regenerateForm) {
  // The player listing is unique to each client, so we need to rebuild it and
  // send it out individually.
  clients.forEach(client => {
    Twig.renderFile('./views/players-container.twig', {board, client}, (error, html) => {
      client.getSocket().emit('rebuild-players', html);
    });
  });

  if (regenerateForm) {
    Twig.renderFile('./views/form-add-player.twig', {board}, (error, html) => {
      io.sockets.emit('rebuild-player-form', html);
    })
  }
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
