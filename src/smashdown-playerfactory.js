/**
 * Information and methods used for an individual user connection.
 */
class Player {
  constructor(name) {
    this.name = name;
    this.color = color; // Setting to Red by default for now.

    return this;
  }

  setClient(clientID) {
    this.client = clientId;
  }
  getClient() {
    return this.client;
  }

}

module.exports = {
  "createPlayer": (...arguments) => {
    return new Player(...arguments);
  },
};
