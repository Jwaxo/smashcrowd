/**
 * Information and methods to construct a user object for logging in and sessions.
 */

const bcrypt = require('bcrypt');
let SmashCrowd;

class User {

  constructor(crowd, options = {}) {
    this.session = '';
    this.id = null;
    this.email = null;
    this.username = null;
    this.label = '';

    this.clientId = 0;
    this.boards = {};
    this.players = {}; // Organized by board ID.

    if (options) {
      for (let property in options) {
        this[property] = options[property];
      }
    }

    SmashCrowd = crowd;

    return this;
  }

  loadUser(userId) {
    return new Promise(resolve => {
      SmashCrowd.loadUser(userId)
        .then(userData => {
          for (let option in userData) {
            if (option !== 'password') {
              this[option] = userData[option];
            }
          }

          resolve();
        });
    });
  }

  updateUserRow(fieldvalues) {
    SmashCrowd.dbUpdate('users', fieldvalues, `id = "${this.getId()}"`);
  }

  setId(userId) {
    this.id = userId;
  }
  getId() {
    return this.id;
  }

  setClientId(clientId) {
    this.clientId = clientId;
  }
  getClientId() {
    return this.clientId;
  }

  setEmail(email) {
    this.email = email;
  }
  getEmail() {
    return this.email;
  }

  setUsername(username) {
    this.username = username;
  }
  getUsername() {
    return this.username;
  }

  setAvatar(avatar) {
    this.avatar = avatar;
  }
  getAvatar() {
    return this.avatar || SmashCrowd.getDefaultAvatar();
  }

  /**
   * Store a Player in the users's information. The user's info gets passed
   * to the Player as well, but without passing the full object; this would cause
   * recursion and an infinite call stack.
   *
   * @param {number} boardId
   *   The boardId that we need to add the player to for the user.
   * @param {Player|null} player
   *   The new player this user is assigned. To remove a player from a user,
   *   pass in `null`.
   */
  setPlayer(boardId, player) {
    // If a player is already set, remove this user from it.
    if (this.hasPlayerAtBoard(boardId)) {
      this.players[boardId].setUserId(0);
      this.players[boardId].setClientId(0);
    }

    // Store the new player information and update said player, or just remove
    // the ID if we're wiping the player info.
    this.players[boardId] = player;
    if (player) {
      player.setUserId(this.id);
      player.setClientId(this.clientId);
    }

    // For now, we set the user to have the same label as the Player.
    if (this.username === 'anonymous') {
      this.setLabel(player.getName());
    }

    this.updatePlayerStorage();
  }
  getPlayer(boardId) {
    if (this.hasPlayerAtBoard(boardId)) {
      return this.players[boardId];
    }
    return null;
  }
  getPlayerId(boardId) {
    if (this.hasPlayerAtBoard(boardId)) {
      return this.players[boardId].getId();
    }
    return null;
  }
  hasPlayerAtBoard(boardId) {
    let hasPlayer = false;
    if (this.players.hasOwnProperty(boardId) && this.players[boardId] !== null) {
      hasPlayer = true;
    }
    return hasPlayer;
  }
  unsetPlayer(boardId) {
    this.players[boardId] = null;
  }

  updatePlayerStorage() {
    return this.playerStorage = 'smashcrowd-' + this.getGameId();
  }
  getPlayerCookie() {
    return this.playerStorage;
  }

  setGameId(gameId) {
    this.gameId = gameId;
    this.updatePlayerStorage();
  }
  getGameId() {
    return this.gameId;
  }

  /**
   * Return human-readible name. Users have a variety of ways to label themselves.
   *
   * By default we go with the "label" version of a username. If the user has
   * a player and that player has a name, we prioritize that. If nothing else,
   * we go with the base username of the user.
   *
   * @returns {string}
   */
  getLabel(boardId) {
    let label = this.label;
    if (!label) {
      label = this.getUsername();
    }
    if (this.players.hasOwnProperty(boardId)) {
      label = this.players[boardId].getName();
    }
    return label;
  }
  setLabel(label) {
    this.label = label;
    this.updateUserRow({"label": label});
  }

  /**
   * Attempts to log a user in with credentials, and sets the user up if success.
   *
   * @param {string} username
   * @param {string} password
   *  The plaintext password that the end user attempted.
   * @param {boolean} skipPassword
   *  FOR ADMIN USE ONLY. Skips the password step.
   *
   * @returns {Promise<boolean>}
   */
  async loginUser(username, password, skipPassword = false) {
    let allowLogin = false;
    let userData = null;
    await SmashCrowd.loadUserByUsername(username)
      .then(loadedUser => {
        userData = loadedUser;

        if (userData !== null) {
          // A user by this username exists, so let's check the password.

          if (skipPassword) {
            allowLogin = true;
          }
          else if (bcrypt.compareSync(password, userData.password)) {
            // The password checks out, let's login.
            allowLogin = true;
          }
        }
      });

    // We should only have allowLogin true if userdata exists, but we check again
    // anyway, in case the framework changes in the future.
    if (allowLogin && userData !== null) {
      // Everything is green, let's log in.
      this.setId(userData.id);
      this.setUsername(userData.username);
      this.setLabel(userData.label);
      this.setEmail(userData.email);
      this.setAvatar(userData.avatar);
    }

    return allowLogin;
  }

  /**
   * Checks if given unique user information is already in the database.
   *
   * @param {string} email
   * @param {string} username
   * @returns {Promise<number>}
   *   The available state of the user.
   *     - 0: available
   *     - 1: username taken
   *     - 2: email taken
   */
  async checkUserAvailable(email, username) {
    let available = 0;

    await Promise.all([
      new Promise(resolve => {
        SmashCrowd.dbSelectFirst('users', 'username', `username = "${username}"`)
          .then(results => {
            if (results) {
              // Username is already taken.
              available = 1;
            }
            resolve();
          });
      }),
      new Promise(resolve => {
        SmashCrowd.dbSelectFirst('users', 'email', `email = "${email}"`)
          .then(results => {
            if (results) {
              // Email is already taken.
              available = 2;
            }
            resolve();
          });
      }),
    ]);

    return available;
  }

}

module.exports = User;
