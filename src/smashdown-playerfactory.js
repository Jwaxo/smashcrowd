/**
 * Information and methods used for an individual user connection.
 */
class Player {
  constructor(name) {
    this.name = name;
    this.characters = [];
    this.clientId = 0;
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

  setClientId(clientId) {
    this.clientId = clientId;
  }
  getClientId() {
    return this.clientId;
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

  setActive(state) {
    this.isActive = state;
  }

}

module.exports = {
  "createPlayer": (...arguments) => {
    return new Player(...arguments);
  },
};
