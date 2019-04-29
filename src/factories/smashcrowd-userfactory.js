/**
 * Information and methods to construct a user object for logging in and sessions.
 */

const bcrypt = require('bcrypt');
let SmashCrowd;

class User {

  constructor(crowd) {
    this.session = '';
    this.id = null;
    this.email = null;
    this.username = null;
    this.label = '';

    this.clientId = 0;
    this.boards = {};
    this.players= {}; // Organized by board ID.

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
   * Assuming successfully validated user info, creates the user.
   *
   * @param {string} email
   * @param {string} username
   * @param {string} password
   */
  registerUser(email, username, password) {
    this.setEmail(email);
    this.setUsername(username);
    SmashCrowd.createUser(this, this.constructor.passwordHash(password));
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
        SmashCrowd.dbSelect('user', 'username', `username = "${username}"`)
          .then(results => {
            if (results.length > 0) {
              available = 1;
            }
            resolve();
          });
      }),
      new Promise(resolve => {
        SmashCrowd.dbSelect('user', 'email', `email = "${email}"`)
          .then(results => {
            if (results.length > 0) {
              available = 2;
            }
            resolve();
          });
      }),
    ]);

    return available;
  }

  /**
   * Hash a given password with bcrypt methods and return the hash.
   *
   * @param {string} password
   * @returns {string}
   */
  static passwordHash(password) {
    bcrypt.hash(password, 10, (err, hash) => {
      password = hash;
    });
    return password;
  }

}

module.exports = User;
