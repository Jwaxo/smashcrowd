/**
 * @file
 * Defines overall server and socket functionality of Smashcrowd.
 */

const Twig = require('twig');
const express = require('express');

const socketio = require('socket.io');
const http = require('http');

const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

const Client = require('./src/factories/smashcrowd-clientfactory.js');
const Player = require('./src/factories/smashcrowd-playerfactory.js');
const Character = require('./src/factories/smashcrowd-characterfactory.js');
const Board = require('./src/factories/smashcrowd-boardfactory.js');
const Stage = require('./src/factories/smashcrowd-stagefactory.js');

const clients = [];
const chatHistory = [];
const app = express();
const server = http.Server(app);
const io = socketio(server);
let SmashCrowd;
let console_colors = {};

module.exports = (crowd, config) => {
  const port = config.get('server.port');
  SmashCrowd = crowd;
  console_colors = config.get('server.console_colors');

  // Currently we only run one board at a time, so load board 1.
  const board = crowd.getBoardById(1);

  // Listen at the port.
  server.listen(port, () => {
    console.log(`Listening on ${port}`);
  });

  serverLog(`New game board generated with ID ${board.getGameId()}`, true);

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

  /**
   * Handling of individual sockets as they remain connected.
   * Creates a Client to track the user at the socket, which is then used for all
   * received commands.
   */
  io.on('connection', socket => {
    serverLog(`New connection established with hash ${socket.id}`, true);

    const randomColor = Math.floor(Math.random() * (console_colors.length));

    const client = new Client(socket, SmashCrowd);
    const clientId = clients.push(client);
    client.setId(clientId);
    client.setColor(chalk[console_colors[randomColor]]);

    const user = client.getUser();
    user.setGameId(board.getGameId());

    // @todo: Now track characters, stages, and users with the actual database.
    // And we should be done!

    serverLog(`${client.getLabel(board.getId())} assigned to socket ${socket.id}`, true);

    // Generate everything just in case the connections existed before the server.
    setClientInfoSingle(client);
    regeneratePlayers(board);
    regenerateCharacters(board);
    regenerateStages(board);
    regenerateChatSingle(socket);

    // Set a default status for a connection if there are no players.
    if (!user.getPlayerId(board.getId())) {
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
      const board_id = board.getId();
      serverLog(`${client.getLabel(board_id)} adding player ${name}`);
      SmashCrowd.createPlayer(name, board)
        .then(player => {
          if (!user.getPlayer(board.getId())) {
            // If the client doesn't yet have a player, assume they want this one for
            // now.
            serverLog(`${client.getLabel(board_id)} automatically taking control of player ${player.getName()}`);
            setClientPlayer(board, client, player);
          }

          clients.forEach(client => {
            if (!client.getPlayerIdByBoard(board.getId())) {
              setStatusSingle(client, 'Pick a player to draft.');
            }
          });

          regeneratePlayers(board, false);
        });
    });

    /**
     * The client user picks which player they are currently representing.
     *
     * Adds the player to the client, the client to the player, and clears the info
     * from a prior player (if there was one), before regenerating player area.
     */
    socket.on('pick-player', playerId => {
      if (playerId !== null) {
        serverLog(`${client.getLabel(board.getId())} looking for ${playerId}`, true);
        const player = board.getPlayer(playerId);

        if (player && !player.getClientId()) {
          serverLog(`${client.getLabel(board.getId())} taking control of player ${player.getName()}`);
          setClientPlayer(board, client, player);
        }
        else if (player) {
          serverLog(`${playerId} already occupied, not assigned`, true);
        }
        else {
          serverLog(`${playerId} does not exist, not assigned`, true);
        }
      }
    });

    /**
     * The client picks a character to add to their player's roster.
     *
     * Adds the character to the roster, removes the character from the total
     * character list, and advances the pick order.
     */
    socket.on('add-character', charId => {
      const player = user.getPlayer(board.getId());
      let character = board.getCharacter(charId);

      const results = board.draft.addCharacter(board, player, character);

      if (results['type'] === 'error') {
        setStatusSingle(client, results['message']);
        switch (results['error']) {
          // @todo: have a repository of error messages and a single function.
          case 'error_add_char_not_drafting':
            serverLog(`${client.getLabel(board.getId())} tried to add ${character.getName()} but drafting has not started.`);
            break;

          case 'error_add_char_no_player':
            serverLog(`${client.getLabel(board.getId())} tried to add ${character.getName()} but does not have a player selected!`);
            break;

          case 'error_add_char_not_turn':
            serverLog(`${client.getLabel(board.getId())} tried to add ${character.getName()} but it is not their turn.`);
            break;

          case 'error_add_char_max_characters':
            serverLog(`${client.getLabel(board.getId())} tried to add ${character.getName()} but has already added maximum characters!`);
            break;

          default:
            serverLog(`${client.getLabel(board.getId())} experienced error adding ${character.getName()}`);
        }
      }
      else if (results['type'] === 'success') {

        switch (results['log']) {
          case 'log_add_char':
          default:
            serverLog(`${client.getLabel(board.getId())} adding character ${character.getName()}.`);
            break;

        }

        // Move the draft along with our updated data!
        const postDraftFunctions = board.draft.advanceDraft(board, client, results['data']);

        // Run all of the defined callbacks.
        for (let functionIndex in postDraftFunctions) {
          const functionName = Object.keys(postDraftFunctions[functionIndex])[0];
          if (typeof eval(functionName) === 'function') {
            eval(functionName)(...postDraftFunctions[functionIndex][functionName]);
          }
        }
      }
    });

    socket.on('player-character-click', (charId, charRound, playerId) => {
      // We need to do different things depending upon the state of the board and
      // what type of draft we're running.
      const clientPlayer = user.getPlayer(board.getId());
      const clickedPlayer = board.getPlayer(playerId);
      const character_index = charRound - 1;

      // The user is marking a winner of a round.
      if (board.getGameRound() === charRound) {
        if (charId !== 999) {
          clickedPlayer.addStat('game_score');
          clickedPlayer.setCharacterState(character_index, 'win');
          for (let board_player_id in board.getPlayers()) {
            const eachPlayer = board.getPlayer(board_player_id);
            if (eachPlayer.getId() !== playerId) {
              eachPlayer.addStat('lost_rounds');
              eachPlayer.setCharacterState(character_index, 'loss');
            }
          }
          advanceGame(board);
        }
        else {
          serverLog(`${client.getLabel(board.getId())} tried to mark a non-player as winner!`);
        }
      }
      // The user is removing a character from their roster.
      else if (board.getDraftType(true) === 'free' && clientPlayer.getId() === playerId) {
        clientPlayer.dropCharacter(character_index);
        // If the draft was marked complete, uncomplete it!
        if (board.checkStatus('draft-complete')) {
          board.setStatus('draft');
          regenerateBoardInfo(board);
        }

        advanceFreePick(board, client);
        regeneratePlayers(board);
      }
    });

    socket.on('player-remove-click', playerId => {
      const clickedPlayer = board.getPlayer(playerId);
      const isCurrentPlayer = user.getPlayerId(board.getId()) === playerId;

      // First make sure that either the client's player and the clicked playerId
      // match, or the clicked player is unowned.
      if (isCurrentPlayer || !clickedPlayer.getClientId()) {

        // First remove the player from the client.
        if (isCurrentPlayer) {
          user.setPlayer(board.getId(), null);
        }
        board.dropPlayer(playerId);
        regeneratePlayers(board);

        serverLog(`${client.getLabel(board.getId())} removed player ${clickedPlayer.getName()}`);
      }
      else {
        // Since remove buttons should be automatically hidden, this person is
        // trying a little too hard.
        serverLog(`${client.getLabel(board.getId())} tried to remove a player owned by someone else.`);
      }

    });

    socket.on('click-stage', stageId => {
      const player = user.getPlayer(board.getId());
      const stage = board.getStage(stageId);

      if (player !== null) {
        if (!player.hasStage(stage)) {
          serverLog(`${client.getLabel(board.getId())} voting for stage ${stage.getName()}`);
          Board.addStageToPlayer(player, stage);
        }
        else {
          serverLog(`${client.getLabel(board.getId())} dropping vote for stage ${stage.getName()}`);
          Board.dropStageFromPlayer(player, stage);
        }

        updateStageInfo(stage);
      }
    });

    socket.on('start-draft', () => {
      serverLog(`${client.getLabel(board.getId())} started the draft.`);
      board.startDraft();

      regenerateBoardInfo(board);
      regenerateCharacters(board);
      regeneratePlayers(board, true);
      setStatusAll('The draft has begun!', 'success');
    });

    socket.on('start-game', () => {
      const players = board.getPlayers();

      let mismatchedChars = false;
      let compare_characters = null;
      for (let board_player_id of Object.keys(board.getPlayers())) {
        const player = board.getPlayer(board_player_id);
        if (compare_characters !== null && compare_characters !== player.getCharacterCount()) {
          mismatchedChars = true;
        }
        compare_characters = player.getCharacterCount();
      }

      if (!mismatchedChars) {

        serverLog(`${client.getLabel(board.getId())} started the game.`);
        if (!board.getTotalRounds()) {
          // This had no total rounds initially, so set based off of the total
          // characters of any given player.
          board.setTotalRounds(board.getPlayers()[0].getCharacterCount());
        }

        players.forEach(player => {
          player.setActive(false);
        });

        advanceGame(board);

        // We only need to regenerate characters on game start, not every round,
        // since we want to hide them.
        regenerateCharacters(board);
        // Same for stages; they get disabled when the game starts.
        regenerateStages(board);

        setStatusAll('The game has begun!', 'success');
      }
      else {
        setStatusSingle(client, 'Cannot start the game: players do not have even characters.', 'error');
      }
    });

    // Reset the entire game board, characters, and others. Keeps players.
    socket.on('reset', data => {
      serverLog(`${client.getLabel(board.getId())} requested a server reset.`);
      resetGame(board, data);
    });

    // Shuffles the players to a random order.
    socket.on('players-shuffle', () => {
      serverLog(`${client.getLabel(board.getId())} shuffled the players.`);

      board.shufflePlayers();

      setStatusSingle(client, 'Players shuffled!');

      regeneratePlayers(board);
    });

    // Be sure to remove the client from the list of clients when they disconnect.
    socket.on('disconnect', () => {
      const player = user.getPlayer(board.getId());
      let noPlayer = true;
      if (player !== null) {
        noPlayer = false;
      }

      // If the client didn't have a player, don't bother announcing their
      // departure.
      serverLog(`${client.getLabel(board.getId())} disconnected.`, noPlayer);
      user.setPlayer(board.getId(), null);

      regeneratePlayers(board);
    });
  });
};

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
 * Set a Client's Player, then updates the HTML of all clients to match.
 *
 * Note that this does not spark a regeneratePlayers, which allows us to do a few
 * transition animations and such.
 *
 * @param {Board} board
 * @param {Client} client
 * @param {Player} player
 */
function setClientPlayer(board, client, player) {
  const updatedPlayers = [];
  const user = client.getUser();

  // First remove the current client's player so it's empty again.
  if (user.getPlayerId(board.getId()) !== null) {
    const prevPlayer = user.getPlayer(board.getId());
    serverLog(`Removing ${client.getColor()(`Client ${client.getId()}`)} from player ${prevPlayer.getName()}`, true);
    user.setPlayer(board.getId(), null);

    updatedPlayers.push({
      'playerId': prevPlayer.getId(),
      'clientId': 0,
    });
  }

  user.setPlayer(board.getId(), player);

  updatedPlayers.push({
    'playerId': player.getId(),
    'clientId': client.getId(),
  });

  setClientInfoSingle(client, true);

  updateCharactersSingle(client, {allDisabled: !player.isActive});
  updatePlayersInfo(board, updatedPlayers);

  regenerateStages(board);
}

/**
 * Advances the game to the next round.
 */
function advanceGame(board) {
  const round = board.advanceGameRound();
  if (round > board.getTotalRounds()) {
    board.setStatus('game-complete');
  }

  // Go through all players and update their rosters.
  regeneratePlayers(board);
  regenerateBoardInfo(board);
}

/**
 * Set all options back to defaults.
 */
function resetGame(board, boardData) {
  board.resetGame();
  const gameId = board.getGameId();

  if (boardData.draftType) {
    board.setDraft(boardData.draftType);
  }
  if (boardData.totalRounds) {
    board.setTotalRounds(boardData.totalRounds);
  }

  clients.forEach(client => {
    const user = client.getUser();
    user.unsetPlayer(board.getId());
    user.setGameId(board.getGameId());
    setClientInfoSingle(client, true);
    serverLog(`Wiping player info for ${client.getLabel(board.getId())}`);
  });

  regenerateBoardInfo(board);
  regeneratePlayers(board, true);
  regenerateCharacters(board);
  regenerateStages(board);

  serverLog(`New game board generated with ID ${gameId}`);
}

/**
 * Takes an array of info for updated player rosters and renders the rosters.
 *
 * @param {Board} board
 * @param {array} updatedPlayers
 * @returns {array}
 */
function renderPlayersRosters(board, updatedPlayers) {
  for (let i = 0; i < updatedPlayers.length; i++) {
    const player = board.getPlayer(updatedPlayers[i].playerId);
    updatedPlayers[i].roster_html = renderPlayerRoster(board, player);
  }
  return updatedPlayers;
}

/**
 * Twig renders out the list of characters in a given player's roster.
 *
 * @param {Board} board
 * @param {Player} player
 * @returns {string}
 */
function renderPlayerRoster(board, player) {
  let rendered = '';

  Twig.renderFile('./views/player-roster.twig', {player, board}, (error, html) => {
    rendered = html;
  });

  return rendered;
}

/**
 * Renders the board info and updates all clients with new board info.
 */
function regenerateBoardInfo(board) {
  Twig.renderFile('./views/board-data.twig', {board}, (error, html) => {
    io.sockets.emit('rebuild-boardInfo', html);
  });
}

/**
 * Renders the players and updates all clients with new player info.
 *
 * @param {Board} board
 * @param {boolean} regenerateForm
 *   Whether or not the "Add Player" form should also be regenerated. Only needed
 *   when starting a new draft or setting up a new game.
 */
function regeneratePlayers(board, regenerateForm = false) {
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

/**
 * Renders the character select screen and updates all clients with new char info.
 */
function regenerateCharacters(board) {
  Twig.renderFile('./views/characters-container.twig', {board}, (error, html) => {
    io.sockets.emit('rebuild-characters', html);
  });
}

/**
 * Renders the players and updates all clients with new player info.
 */
function regenerateChatSingle(socket) {
  Twig.renderFile('./views/chat-container.twig', {chatHistory}, (error, html) => {
    socket.emit('rebuild-chat', html);
  });
}

/**
 * Renders the stage select screen and votes.
 */
function regenerateStages(board) {
  // The stage listing is unique to each client to show which votes are yours, so
  // we also need to update them whenever it changes.
  clients.forEach(client => {
    Twig.renderFile('./views/stages-container.twig', {board, client}, (error, html) => {
      client.getSocket().emit('rebuild-stages', html);
    });
  });
}

/**
 * Sends client info to that client.
 *
 * Since Clients contain socket information, we need to remove that prior to
 * passing, or else the whole app will crash.
 *
 * @param {Client} socketClient
 *   The Client object with socket information attached.
 * @param {Boolean} isUpdate
 *   If this is the initial client setting or a later update.
 */
function setClientInfoSingle(socketClient, isUpdate = false) {
  const client = cleanClient(socketClient);
  // Make sure to clean client before sending it.
  socketClient.getSocket().emit('set-client', client, isUpdate);
}

/**
 * Sends an array of players with changed data to inform clients without needing
 * to completely rebuild the player area.
 *
 * @param {Board} board
 * @param {Array} updatedPlayers
 */
function updatePlayersInfo(board, updatedPlayers) {
  io.sockets.emit('update-players', renderPlayersRosters(board, updatedPlayers));
}

/**
 * Sends an array of stages with changed data to inform clients without needing
 * to completely rebuild the stage area.
 *
 * @param {Stage} stage
 */
function updateStageInfo(stage) {
  clients.forEach(client => {
    const player = client.getPlayerByBoard();
    Twig.renderFile('./views/stage.twig', {stage, player}, (error, html) => {
      client.getSocket().emit('update-stage', html, stage.getId());
    });
  });
}

/**
 * Sends character select data with changed info to one client.
 *
 * @see updateCharacters().
 *
 * @param {Client} client
 * @param {Object} character_data
 */
function updateCharactersSingle(client, character_data) {
  client.socket.emit('update-characters', character_data);
}

/**
 * Sends character select data with changed data to all clients.
 *
 * Used to inform clients without needing to completely rebuild the character area.
 *
 * @param {Object} character_data
 *   {boolean} allDisabled
 *     If the character select sheet should be disabled or enabled.
 *   {Array} chars
 *     An array of objects describing characters by their ID and how to update
 *     them. Current allowed properties:
 *     - {integer} charId: the ID of the character to update.
 *     - {boolean} disabled: whether or not the character should be removed from
 *       the list.
 */
function updateCharacters(character_data) {
  io.sockets.emit('update-characters', character_data);
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
  safeClient.user = null;

  return safeClient;
}
