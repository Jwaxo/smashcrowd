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
  console_colors = config.get('server.console_colors')

  // Currently we only run one board at a time, so set the ID to 1.
  const board = new Board(1, config.get('server.default_board'));

  // Load characters from the character data file.
  board.buildAllCharacters(SmashCrowd.getCharacters());
  board.buildAllStages(require('./src/lib/levels.json'));

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

    const client = new Client(socket, board.getGameId());
    const clientId = clients.push(client);
    client.setId(clientId);
    client.setColor(chalk[console_colors[randomColor]]);

    serverLog(`${client.getLabel()} assigned to socket ${socket.id}`, true);

    // Generate everything just in case the connections existed before the server.
    setClientInfoSingle(client);
    regeneratePlayers(board);
    regenerateCharacters(board);
    regenerateStages(board);
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
        setClientPlayer(board, client, player);
        client.setPlayer(player);
      }

      clients.forEach(client => {
        if (!client.getPlayerId()) {
          setStatusSingle(client, 'Pick a player to draft.');
        }
      });

      regeneratePlayers(board, false);
    });

    /**
     * The client user picks which player they are currently representing.
     *
     * Adds the player to the client, the client to the player, and clears the info
     * from a prior player (if there was one), before regenerating player area.
     */
    socket.on('pick-player', playerId => {
      if (playerId !== null) {
        serverLog(`${client.getLabel()} looking for ${playerId}`, true);
        const player = board.getPlayerById(playerId);

        if (player && !player.getClientId()) {
          serverLog(`${client.getLabel()} taking control of player ${player.getName()}`);
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
      const player = client.getPlayer();
      let character = board.getCharacter(charId);

      // If we're playing with Free pick, build a new character with this info so
      // that we don't disrupt the board.
      if (board.getDraftType === 'free' || charId === 999) {
        character = new Character(charId, board.charData[charId]);
      }

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
        serverLog(`${client.getLabel()} tried to add ${character.getName()} but has already added maximum characters!`);
        setStatusSingle(client, 'You have reached the maximum number of characters!', 'alert');
      }
      else {
        // We can add the character!
        serverLog(`${client.getLabel()} adding character ${character.getName()}.`);

        player.addCharacter(character);

        if (board.getDraftType() !== 'free') {
          // By default we'll only be disabling the character selection until
          // processing has finished and the client has been updated.
          const characterUpdateData = {
            'allDisabled': false,
          };

          // If the player didn't pick the "sit out" option, remove it from the roster.
          if (charId !== 999) {
            character.setPlayer(player.getId());

            characterUpdateData.chars = [
              {
                'charId': charId,
                'disabled': true,
              },
            ];
          }
          advanceDraft(board, characterUpdateData);
        }
        else {
          advanceFreePick(board, client);
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
        if (charId !== 999) {
          clickedPlayer.addStat('game_score');
          clickedPlayer.setCharacterState(character_index, 'win');
          board.getPlayers().forEach(eachPlayer => {
            if (eachPlayer.getId() !== playerId) {
              eachPlayer.addStat('lost_rounds');
              eachPlayer.setCharacterState(character_index, 'loss');
            }
          });
          advanceGame(board);
        }
        else {
          serverLog(`${client.getLabel()} tried to mark a non-player as winner!`);
        }
      }
      // The user is removing a character from their roster.
      else if (board.getDraftType() === 'free' && clientPlayer.getId() === playerId) {
        clientPlayer.dropCharacter(character_index);
        // If the draft was marked complete, uncomplete it!
        if (board.getStatus() === 'draft-complete') {
          board.setStatus('draft');
          regenerateBoardInfo(board);
        }

        advanceFreePick(board, client);
        regeneratePlayers(board);
      }
    });

    socket.on('player-remove-click', playerId => {
      const clickedPlayer = board.getPlayerById(playerId);
      const isCurrentPlayer = client.getPlayerId() === playerId;

      // First make sure that either the client's player and the clicked playerId
      // match, or the clicked player is unowned.
      if (isCurrentPlayer || !clickedPlayer.getClientId()) {

        // First remove the player from the client.
        if (isCurrentPlayer) {
          client.setPlayer(null);
        }
        board.dropPlayerById(playerId);
        regeneratePlayers(board);

        serverLog(`${client.getLabel()} removed player ${clickedPlayer.getName()}`);
      }
      else {
        // Since remove buttons should be automatically hidden, this person is
        // trying a little too hard.
        serverLog(`${client.getLabel()} tried to remove a player owned by someone else.`);
      }

    });

    socket.on('click-stage', stageId => {
      const player = client.getPlayer();
      const stage = board.getStage(stageId);

      if (player !== null) {
        if (!player.hasStage(stage)) {
          serverLog(`${client.getLabel()} voting for stage ${stage.getName()}`);
          player.addStage(stage);
        }
        else {
          serverLog(`${client.getLabel()} dropping vote for stage ${stage.getName()}`);
          player.dropStage(stage);
        }

        updateStageInfo(stage);
      }
    });

    socket.on('start-draft', () => {
      serverLog(`${client.getLabel()} started the draft.`);
      board.advanceDraftRound();

      if (board.getDraftType() === 'free') {
        board.getPlayers().forEach(player => {
          player.setActive(true);
        });
      }
      else {
        board.getPlayerByPickOrder(0).setActive(true);
      }

      regenerateBoardInfo(board);
      regenerateCharacters(board);
      regeneratePlayers(board, true);
      setStatusAll('The draft has begun!', 'success');
    });

    socket.on('start-game', () => {
      const players = board.getPlayers();

      const mismatchedChars = board.eachPlayer((player, compareObject) => {
        if (compareObject.hasOwnProperty('last') && compareObject.last !== player.getCharacterCount()) {
          return true;
        }
        compareObject.last = player.getCharacterCount();
      });

      if (!mismatchedChars) {

        serverLog(`${client.getLabel()} started the game.`);
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
      serverLog(`${client.getLabel()} requested a server reset.`);
      resetGame(board, data);
    });

    // Shuffles the players to a random order.
    socket.on('players-shuffle', () => {
      serverLog(`${client.getLabel()} shuffled the players.`);

      board.shufflePlayers();

      setStatusSingle(client, 'Players shuffled!');

      regeneratePlayers(board);
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

  client.setPlayer(player);

  updatedPlayers.push({
    'playerId': player.getId(),
    'clientId': client.getId(),
    'roster_html': renderPlayerRoster(board, player),
  });

  setClientInfoSingle(client, true);

  updateCharactersSingle(client, {allDisabled: !player.isActive});
  updatePlayersInfo(updatedPlayers);

  regenerateStages(board);
}

/**
 * Since free pick doesn't have a nice, easy draft count of rounds, we need to
 * track how many characters each player has added, and update the board info/
 * state if they've all picked.
 *
 * @params {Client} client
 *  The client that just picked.
 * @params {Player} player
 *  The player that just picked.
 */
function advanceFreePick(board, client) {
  const updatedPlayers = [];
  const player = client.getPlayer();

  player.setActive((!board.getTotalRounds() || player.getCharacterCount() < board.getTotalRounds()));

  // Disable/Enable picking for this user.
  updateCharactersSingle(client, {allDisabled: !player.isActive});

  updatedPlayers.push({
    'playerId': player.getId(),
    'isActive': player.isActive,
    'roster_html': renderPlayerRoster(board, player),
  });

  updatePlayersInfo(updatedPlayers);

  // If any single player is not yet ready, don't update the board info.
  const draftComplete = !board.eachPlayer([board.getTotalRounds()], (player, totalRounds) => {
    if (player.getCharacterCount() < totalRounds) {
      return true;
    }
  });

  if (draftComplete) {
    board.setStatus('draft-complete');
    regenerateBoardInfo(board);
  }
}

/**
 * Move to the next active player and do any additional processing.
 */
function advanceDraft(board, characterUpdateData) {

  const prevPlayer = board.getActivePlayer();
  const updatedPlayers = [];

  if (board.getDraftRound() === 1 && board.getPick() === 0) {
    // If this is the first pick of the game, tell clients so that we can update
    // the interface.
    setStatusAll('Character drafting has begun!', 'success');
  }

  // This boolean tells us if the most recent pick ended the round.
  // If players count goes evenly into current pick, we have reached a new round.
  const newRound = (board.advancePick() % board.getPlayersCount() === 0);

  // If our round is new and the pre-advance current round equals the total, end!
  if (newRound && board.getDraftRound() === board.getTotalRounds()) {
    serverLog(`Drafting is now complete!`);
    io.sockets.emit('draft-complete');
    board.getActivePlayer().setActive(false);
    board.setStatus('draft-complete');
    regenerateBoardInfo(board);
    regeneratePlayers(board);
    regenerateCharacters(board);
  }
  else {
    // On with the draft!
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
      // Make sure the characters stay disabled, since this player is no longer
      // active.
      characterUpdateData.allDisabled = true;

      prevPlayer.setActive(false);
      currentPlayer.setActive(true);

      updatedPlayers.push({
        'playerId': currentPlayer.getId(),
        'isActive': true,
      });
      setStatusSingle(currentClient, 'It is your turn! Please choose your next character.', 'primary');
    }

    // If we're at a new round in snake draft we need to regenerate the player
    // area entirely so that they reorder. Otherwise just update stuff!
    if (newRound && board.getDraftType() === 'snake') {
      setStatusSingle(currentClient, 'With the new round, it is once again your turn! Choose wisely.', 'primary');
      regenerateBoardInfo(board);
      regeneratePlayers(board);
    }
    else {
      updatedPlayers.push({
        'playerId': prevPlayer.getId(),
        'isActive': prevPlayer.isActive,
        'roster_html': renderPlayerRoster(board, prevPlayer),
      });

      updatePlayersInfo(updatedPlayers);
    }

    updateCharacters(characterUpdateData);
  }
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
    board.setDraftType(boardData.draftType);
  }
  if (boardData.totalRounds) {
    board.setTotalRounds(boardData.totalRounds);
  }

  clients.forEach(client => {
    client.setPlayer(null);
    client.setGameId(board.getGameId());
    setClientInfoSingle(client, true);
    serverLog(`Wiping player info for ${client.getLabel()}`);
  });

  regenerateBoardInfo(board);
  regeneratePlayers(board, true);
  regenerateCharacters(board);
  regenerateStages(board);

  serverLog(`New game board generated with ID ${gameId}`);
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
 * @param {Array} players
 */
function updatePlayersInfo(players) {
  io.sockets.emit('update-players', players);
}

/**
 * Sends an array of stages with changed data to inform clients without needing
 * to completely rebuild the stage area.
 *
 * @param {Stage} stage
 */
function updateStageInfo(stage) {
  clients.forEach(client => {
    const player = client.getPlayer();
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

  return safeClient;
}
