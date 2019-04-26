/**
 * Information and methods used for a player on a board.
 *
 * "Players" are non-database-registered instances of a user, specific to an
 * individual board.
 *
 * It made sense to keep them separate at the time.
 */
class Player {
  constructor(name) {
    this.name = name;
    this.characters = [];
    this.stages = [];
    this.clientId = 0;
    this.isActive = false;
    this.playerId = null;
    this.stats = {};
    this.sortOrder = null;
    this.user = null;

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

  addStage(stage) {
    this.stages.push(stage);
    stage.addPlayer(this.playerId);
    return this.stages;
  }
  setStages(stages) {
    this.stages = stages;
  }
  hasStage(stage) {
  return this.stages.indexOf(stage) !== -1;
  }
  getStages() {
    return this.stages;
  }
  getStageCount() {
    return this.stages.length;
  }
  dropStage(stage) {
    const index = this.stages.indexOf(stage);
    if (index !== -1) {
      this.stages.splice(index, 1);
      stage.dropPlayer(this.playerId);
    }
  }

  setSortOrder(order) {
    this.sortOrder = order;
  }
  getSortOrder() {
    return this.sortOrder;
  }

  setActive(state) {
    this.isActive = state;
  }

  setStat(stat, val) {
    this.stats[stat] = val;
  }
  getStat(stat) {
    let data = 0;
    if (this.stats.hasOwnProperty(stat)) {
      data = this.stats[stat];
    }
    return data;
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
