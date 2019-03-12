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
    this.stats = {};

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
  dropCharacter(characterIndex) {
    this.characters.splice(characterIndex, 1);
  }
  setCharacterState(characterIndex, value) {
    this.characters[characterIndex].setState(value);
  }

  setActive(state) {
    this.isActive = state;
  }

  setStat(stat, val) {
    this.stats[stat] = val;
  }
  getStat(stat) {
    return this.stats[stat];
  }
  /**
   *
   * @param {String} stat
   */
  addStat(stat) {
    if (this.stats.hasOwnProperty(stat)) {
      this.stats[stat]++;
    }
    else {
      this.stats[stat] = 1;
    }
  }

}

module.exports = Player;
