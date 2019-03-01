/**
 * Information and methods used for an individual user connection.
 */
class Client {
  constructor(socket, color) {
    this.socket = socket;
    this.color = color;// Setting to Red by default for now.

    return this;
  }

  // There shouldn't be a way to set the socket, since clients and sockets have
  // a 1:1 relationship.
  getSocket() {
    return this.socket;
  }

  setColor(color) {
    this.color = color;
  }
  getColor() {
    return this.color;
  }

  setPlayer(playerId) {
    this.player = playerId;
  }
  getPlayer() {
    return this.player;
  }

}

module.exports = {
  "createClient": (...arguments) => {
    return new Client(...arguments);
  },
};
