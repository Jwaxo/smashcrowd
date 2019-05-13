/**
 * Information and methods used for a player on a board.
 *
 * "Players" are non-database-registered instances of a user, specific to an
 * individual board.
 *
 * It made sense to keep them separate at the time.
 */
class Player {
  constructor(name, userId = null) {
    this.name = name;
    this.characters = [];
    this.stages = [];
    this.userId = userId;
    this.clientId = 0;
    this.isActive = false;
    this.playerId = null;
    this.stats = {};
    this.pickOrder = null;
    this.displayOrder = null;
    this.user = null;
    this.board_id = null;

    return this;
  }

  setId(id) {
    this.playerId = id;
  }
  getId() {
    return this.playerId;
  }

  setUserId(userId) {
    this.userId = userId;
  }
  getUserId() {
    return this.userId;
  }

  setBoardId(board_id) {
    this.board_id = board_id;
  }
  getBoardId() {
    return this.board_id;
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
  getCharacterByIndex(index) {
    return this.characters[index];
  }
  getCharacterCount() {
    return this.characters.length;
  }
  dropCharacter(characterIndex) {
    return this.characters.splice(characterIndex, 1)[0];
  }
  setCharacterState(characterIndex, value) {
    this.characters[characterIndex].setState(value);
  }

  addStage(stage) {
    this.stages.push(stage);
    stage.addPlayer(this);
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

  setPickOrder(order, save = false) {
    this.pickOrder = order;
  }
  getPickOrder() {
    return this.pickOrder;
  }
  setDisplayOrder(order) {
    this.displayOrder = order;
  }
  getDisplayOrder() {
    return this.displayOrder;
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
