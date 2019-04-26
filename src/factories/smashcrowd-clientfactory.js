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
    this.player = null;
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
    if (this.user.getLabel() !== 'anonymous') {
      label = this.color(this.user.getLabel());
    }
    else {
      label = this.color(`Client ${this.id}`);
    }
    return label;
  }

  getPlayer(boardId) {
    return this.user.getPlayer(boardId);
  }
  getPlayerId(boardId) {
    return this.user.getPlayerId(boardId);
  }

}

module.exports = Client;
