/**
 * @file
 * Defines overall server and socket functionality of Smashcrowd.
 */

const express = require('express');

const socketio = require('socket.io');
const http = require('http');
const request = require('request');

const chalk = require('chalk');
const stripAnsi = require('strip-ansi');

const Client = require('./src/factories/smashcrowd-clientfactory.js');
const Player = require('./src/factories/smashcrowd-playerfactory.js');
const Character = require('./src/factories/smashcrowd-characterfactory.js');
const Board = require('./src/factories/smashcrowd-boardfactory.js');
const Stage = require('./src/factories/smashcrowd-stagefactory.js');
const User = require('./src/factories/smashcrowd-userfactory.js');

const clients = [];
const chatHistory = [];
const app = express();
const server = http.Server(app);
const uuid = require('uuid/v4');
const io = socketio(server);
const bcrypt = require('bcrypt');

let SmashCrowd;
let console_colors = {};

// Define how sessions are created and tracked.
const session = require('express-session')({
  genid: req => {
    return uuid(); // use UUIDs for session IDs
  },
  secret: 'buff mac',
  resave: false,
  saveUninitialized: true,
});
// Since Express and IO are technically two different types of server trackers,
// we need to track sessions using some middleware.
const sharedSession = require("express-socket.io-session");

module.exports = (crowd, config) => {
  const port = config.get('server.port');
  SmashCrowd = crowd;
  console_colors = config.get('server.console_colors');

  // Currently we only run one board at a time, so load board 1.
  const board = crowd.getBoardById(1);
  SmashCrowd.createBoard(board);

  // Listen at the port.
  server.listen(port, () => {
    console.log(`Listening on ${port}`);
  });

  serverLog(`New game board generated with ID ${board.getGameId()}`, true);

  // Do basic server setup stuff.
  app.use(express.static(__dirname + '/public'));

  // Here we do the Express/IO shared session magic.
  app.use(session);
  io.use(sharedSession(session));

  app.set("twig options", {
    allow_async: true,
    strict_variables: false
  });

  // Serve up the default page.
  /**
   * @todo: Continue into Character and Player information to ensure the toJSON
   *   functions are created and sending properly.
   * @todo: Actually have client app.js send information to the server to update
   *   the board.
   */

  app.get('/client_connection', (req, res) => {
    res.send({});
  });

  // If a user is verifying an email address...
  app.get('/verify_email', (req, res) => {
    // Make sure the userid and the email hash are identified.
    if (req.query.userid && req.query.hash) {
      // Run it past the User static function to verify it.
      User.verifyEmailHash(req.query.userid, req.query.hash)
        .then(results => {
          if (results) {
            // Then update the user and set a status so we can tell them they
            // succeeded.
            SmashCrowd.updateUser(req.query.userid, {active: 'active'});
            req.session.status = 'email_verify_complete';
            res.redirect('/');
          }
        });
    }
    else {
      res.redirect('/');
    }
  });

  /**
   * Handling of individual sockets as they remain connected.
   * Creates a Client to track the user at the socket, which is then used for all
   * received commands.
   */
  io.on('connection', socket => {
    serverLog(`New connection established with hash ${socket.id}`, true);

    const randomColor = Math.floor(Math.random() * (console_colors.length));

    const clientSession = socket.handshake.session;
    const client = new Client(socket, SmashCrowd);
    const clientId = clients.push(client);
    client.setId(clientId);
    client.setColor(chalk[console_colors[randomColor]]);

    let user = client.getUser();

    if (clientSession.userId) {
      // We're resuming a session, so load the user.
      user.loadUser(clientSession.userId)
        .then(() => {
          clientLogin(client, user, board, socket);
        });
    }
    else {
      // No session, so create an anonymous user (for now).
      user.setGameId(board.getGameId());
    }

    serverLog(`${client.getLabel(board.getId())} assigned to socket ${socket.id}`, true);

    // Generate everything that may change based off of an existing client connection
    // or resumed session.
    setRecaptchaKeySingle(config.get('recaptcha.key'), socket);
    setClientInfoSingle(client);
    regenerateBoardInfo(board);
    regeneratePlayers(board);
    regenerateCharacters(board);
    regenerateStages(board);
    regenerateChatSingle(socket);

    const player = client.getPlayerByBoard(board.getId());
    setPlayerSingle(player, socket);
    let playerActive = false;

    // Set a default status for a connection with help tips.
    if (player === null) {
      // Make different suggestions based on if there are players.
      if (board.getPlayersCount() === 0) {
        setStatusSingle(client, 'Add a player in order to start drafting!');
      }
      else {
        setStatusSingle(client, 'Pick a player to draft.')
      }
    }
    else {
      playerActive = player.getActive();
    }

    // Finally, manually disable character picking if we don't have a player and
    // that player isn't active.
    updateCharactersSingle(client, {allDisabled: !playerActive});

    if (clientSession.status) {
      let message = '';
      switch (clientSession.status) {
        case 'email_verify_complete':
          message = "Thank you for verifying your email address!";

          break;
      }
      setStatusSingle(client, message);
    }

    /**
     * The client attempted to login as a user.
     *
     * This data should already be validated clientside, so let's try to login
     * with it.
     */
    socket.on('user-login', data => {
      user.loginUser(data.username, data.password)
        .then(loggedIn => {
          if (loggedIn) {
            clientSession.userId = user.getId();
            clientSession.save();

            clientLogin(client, user, board, socket);
          }
          else {
            const error = {
              elements: ['username', 'password'],
              message: 'Login credentials failed. Please check your username and password and try again.',
            };

            socket.emit('form-user-login-error', error);
          }
        });

    });

    /**
     * The client wants to log out.
     */
    socket.on('user-logout', data => {
      serverLog(`${user.getUsername()} logged out.`);

      clientSession.userId = null;
      clientSession.save();
      client.newUser();

      user = client.getUser();
      setUser(user, socket);
      regeneratePlayersSingle(board, socket);
    });

    /**
     * The client attempted to register a new user.
     *
     * This data should already be validated clientside, we just need to make
     * sure the email and username aren't already in use, and check recaptcha.
     */
    socket.on('register-user', data => {
      const error = {};

      if (!data.recaptcha) {
        error.elements = ['g-recaptcha'];
        error.message = 'Please ensure you have checked the reCAPTCHA';
      }
      else {
        // First run the request past reCAPTCHA to verify humanity.
        request({
          uri: `https://www.google.com/recaptcha/api/siteverify?secret=${SmashCrowd.config.get('recaptcha.secret')}&response=${data.recaptcha}`,
          method: 'POST',
        }, (re_error, response) => {

          if (re_error) {
            console.log(re_error);
          }

          response = JSON.parse(response.body);

          if (!response.success) {
            error.elements = ['g-recaptcha'];
            error.message = 'Something went wrong with the reCAPTCHA. Please try again.';
          }
          else {
            // They're a human, so make sure that their stuff is valid.
            user.checkUserAvailable(data.email, data.username)
              .then(results => {

                switch (results) {

                  // Available.
                  case 0:
                    user.setEmail(data.email);
                    user.setUsername(data.username);
                    SmashCrowd.createUser(user, bcrypt.hashSync(data.password1, 10))
                      .then(userId => {
                        // todo: Do not log registered users in until they verify email.
                        // Status is currently being set to "inactive", but that is unused.
                        clientSession.userId = userId;
                        clientSession.save();

                        SmashCrowd.emailRegistration(user);
                        serverLog(`${client.getLabel(board.getId())} created new user ${data.username}`);

                        socket.emit('form-user-register-complete');
                        regenerateUserToolbar(user, socket);
                      });

                    break;

                  // Username taken.
                  case 1:
                    error.elements = ['username'];
                    error.message = 'This username is already taken. Please try a different one.';

                    break;

                  // Email taken.
                  case 2:
                    error.elements = ['email'];
                    error.message = 'This email is already in use. Please use a different one.';

                    break;
                }
              });
          }
        });
      }

      if (error.hasOwnProperty('elements')) {
        socket.emit('form-user-register-error', error);
      }
    });

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

    socket.on('add-player-by-user', () => {
      const board_id = board.getId();
      const user = client.getUser();
      const name = user.getUsername();
      serverLog(`${client.getLabel(board_id)} adding player from user ${name}`);
      SmashCrowd.createPlayer(name, board, user.getId())
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

          regeneratePlayers(board);
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
          case 'log_switch_char':
            serverLog(`${client.getLabel(board.getId())} changing to character ${character.getName()}.`);
            break;

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
      console.log(`Character clicked! Current board stat is ${board.getStatus(true)}, character round clicked is ${charRound}, current game round is ${board.getGameRound()}`);
      if (board.checkStatus("game") && board.getGameRound() === charRound) {
        if (charId !== 999) {
          serverLog(`${client.getLabel(board.getId())} marked ${clickedPlayer.getName()} as the winner of round ${charRound} with ${board.getCharacter(charId).getName()}`);
          board.setPlayerWin(playerId, charRound);

          advanceGame(board);
        }
        else {
          serverLog(`${client.getLabel(board.getId())} tried to mark a non-player as winner!`);
        }
      }
      // The user is dropping a character while in draft mode.
      else if (board.checkStatus(["draft", "draft-complete"]) && board.getGameRound() < charRound && clientPlayer.getId() === playerId) {
        if (board.draft.dropCharacter(board, client, clientPlayer, character_index)) {
          regenerateBoardInfo(board);
          regeneratePlayers(board);
        }
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
      regeneratePlayers(board);
      setStatusAll('The draft has begun!', 'success');
    });

    socket.on('start-game', () => {
      const players = board.getPlayersArray();

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
          board.setTotalRounds(players[0].getCharacterCount());
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
      // Make sure we only make the player "available" if the user was anonymous.
      if (user.getId() === null) {
        user.setPlayer(board.getId(), null);
      }

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
  const socket = client.getSocket();

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

  // Send updates to all clients so they see the player being controlled.
  updatePlayersInfo(board, updatedPlayers);
  regenerateStages(board);

  // Send out updates to the specific client so that they will know they are the player.
  updateCharactersSingle(client, {allDisabled: !player.isActive});
  setPlayerSingle(player, socket);
}

/**
 * Advances the game via draft function.
 */
function advanceGame(board) {

  // Ask our draft what to do when a game round advances.
  const postGameFunctions = board.draft.advanceGame(board);

  // Run all of the defined callbacks.
  for (let functionIndex in postGameFunctions) {
    const functionName = Object.keys(postGameFunctions[functionIndex])[0];
    if (typeof eval(functionName) === 'function') {
      eval(functionName)(...postGameFunctions[functionIndex][functionName]);
    }
  }
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
  regeneratePlayers(board);
  regenerateCharacters(board);
  regenerateStages(board);

  serverLog(`New game board generated with ID ${gameId}`);
}

/**
 * Renders the board info and updates all clients with new board info.
 */
function regenerateBoardInfo(board) {
  io.sockets.emit('rebuild-boardInfo', board.toJSON());
}

/**
 * Renders the players and updates all clients with new player info.
 *
 * @param {Board} board
 */
function regeneratePlayers(board) {
  // The player listing is unique to each client, so we need to rebuild it and
  // send it out individually.
  const playersArray = board.getPlayersArray();
  clients.forEach(client => {
    client.getSocket().emit('rebuild-players', playersArray);
  });
}

/**
 * Renders the player listing specific to one player.
 */
function regeneratePlayersSingle(board, socket) {
  socket.emit('rebuild-players', board.getPlayersArray());
}

/**
 * Renders the character select screen and updates all clients with new char info.
 *
 * @param {Board} board
 */
function regenerateCharacters(board) {
  const characters = board.getCharacters();
  io.sockets.emit('rebuild-characters', board.getCharacters());
}

/**
 * Renders the character select screen specific to one player and updates them.
 */
function regenerateCharactersSingle(board, socket) {
  socket.emit('rebuild-characters', board.getCharacters());
}

/**
 * Renders the players and updates all clients with new player info.
 */
function regenerateChatSingle(socket) {
  socket.emit('rebuild-chat', chatHistory);
}

/**
 * Renders the stage select screen and votes.
 */
function regenerateStages(board) {
  // The stage listing is unique to each client to show which votes are yours, so
  // we also need to update them whenever it changes.
  clients.forEach(client => {
    client.getSocket().emit('rebuild-stages', board.getStages());
  });
}

/**
 * Sets the user for a particular client/user.
 */
function setUser(user, socket) {
  socket.emit('set-user', user);
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
 * Sends player info to that client.
 */
function setPlayerSingle(player, socket) {
  // Make sure to clean client before sending it.
  socket.emit('set-player', player);
}

/**
 * Sends recaptcha key info to single client.
 */
function setRecaptchaKeySingle(recaptchaKey, socket) {
  socket.emit('set-recaptcha-key', recaptchaKey);
}

/**
 * Sends an array of players with changed data to inform clients without needing
 * to completely rebuild the player area.
 *
 * @param {Board} board
 * @param {Array} updatedPlayers
 */
function updatePlayersInfo(board, updatedPlayers) {
  io.sockets.emit('update-players', updatedPlayers);
}

/**
 * Sends an array of stages with changed data to inform clients without needing
 * to completely rebuild the stage area.
 *
 * @param {Stage} stage
 */
function updateStageInfo(stage) {
  io.sockets.emit('update-stage', stage);
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
  io.sockets.emit('set-status', {type, status});
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
    client.socket.emit('set-status', {type, status});
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
  io.sockets.emit('update-chat', message);
}

/**
 * Perform all of the necessary operations after a user logs in or resumes a session.
 *
 * @param {Client} client
 * @param {User} user
 * @param {Board} board
 * @param {WebSocket} socket
 */
function clientLogin(client, user, board, socket) {

  client.setUser(user.getId());

  // Regenerate anything that may have already loaded without our user
  // info.
  const player = board.getPlayerByUserId(user.getId());
  if (player !== null) {
    user.setPlayer(board.getId(), player);
  }
  setUser(user, socket);
  regeneratePlayersSingle(board, client.getSocket());

  socket.emit('form-user-login-complete');
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
