/**
 * Information and methods used for an individual user connection.
 */
class Player {
  constructor(name) {
    this.name = name;
    this.characters = [];
    this.client = 0;

    return this;
  }

  setClient(clientId) {
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
