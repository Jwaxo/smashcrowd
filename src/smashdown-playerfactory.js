/**
 * Information and methods used for an individual user connection.
 */
class Player {
  constructor(name) {
    this.name = name;
    this.characters = [];
    this.client = 0;
    this.isActive = false;
    this.playerId = null;

    return this;
  }

  setId(id) {
    this.playerId = id;
  }
  getId() {
    return this.playerId;
  }

  setClient(clientId) {
    this.client = clientId;
  }
  getClient() {
    return this.client;
  }

  setName(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }

  addCharacter(character) {
    this.characters.push(character);
    return this.characters;
  }
  setCharacters(characters) {
    this.characters = characters;
  }
  getCharacters() {
    return this.characters;
  }
  getCharacterCount() {
    return this.characters.length;
  }

}

module.exports = {
  "createPlayer": (...arguments) => {
    return new Player(...arguments);
  },
};
