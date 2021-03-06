/**
 * Information and methods used for an individual user connection.
 */

const User = require('./smashcrowd-userfactory.js');

let SmashCrowd;

class Client {
  constructor(socket, crowd) {
    this.id = 0;
    this.socket = socket;
    this.color = null;
    this.userId = null;

    SmashCrowd = crowd;

    this.user = new User(SmashCrowd);

    return this;
  }

  // There shouldn't be a way to set the socket, since clients and sockets have
  // a 1:1 relationship. The only way to remove a socket is to drop it entirely,
  // and this should only be done for utility purposes.
  getSocket() {
    return this.socket;
  }

  setUser(userId) {
    this.userId = userId;
    this.user.loadUser(userId);
    this.user.setClientId(this.id);
  }
  getUser() {
    return this.user;
  }
  getUserId() {
    return this.userId;
  }
  newUser() {
    this.userId = null;
    this.user = new User(SmashCrowd);
  }

  /**
   * Essentially check to see if a User has been properly built, or if we're anon.
   *
   * @returns {boolean}
   */
  isLoggedIn() {
    return this.userId !== null;
  }

  setId(clientId) {
    this.id = clientId;
  }
  getId() {
    return this.id;
  }

  setColor(color) {
    this.color = color;
  }
  getColor() {
    return this.color;
  }

  getLabel(boardId) {
    let label = '';
    if (!['anonymous', null].includes(this.user.getLabel())) {
      label = this.color(this.user.getLabel());
    }
    else {
      label = this.color(`Client ${this.id}`);
    }
    return label;
  }

  getPlayerByBoard(boardId) {
    return this.user.getPlayer(boardId);
  }
  getPlayerIdByBoard(boardId) {
    return this.user.getPlayerId(boardId);
  }
  hasPlayerByBoard(boardId) {
    return this.user.hasPlayerAtBoard(boardId);
  }

}

module.exports = Client;
