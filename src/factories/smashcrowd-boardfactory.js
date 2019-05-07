/**
 * Information and methods used for a drafting board.
 */

const Character = require('./smashcrowd-characterfactory.js');
const Stage = require('./smashcrowd-stagefactory.js');
const fs = require('fs');
let SmashCrowd;

class Board {
  /**
   * Create a new Board, or load a Board from the DB.
   *
   * @param {SmashCrowd} crowd
   * @param {int|Object} options
   *   The ID of the board you wish to load, or an object of configurations.
   * @returns {Board}
   */
  constructor(crowd, options = {}) {
    SmashCrowd = crowd;

    /**
     * The types of drafts currently able to pick.
     * @todo: create a draftfactory, then plugin different draft types.
     */

    this.id = null;
    this.owner = 0;
    this.current_pick = 0;
    this.current_draft_round = 0;
    this.current_game_round = 0;
    this.total_rounds = 0;
    this.name = null;
    this.status = 0;
    this.next_player_id = 0;

    this.draftTypes = SmashCrowd.getSystemValue('draft_types');
    this.setDraft('free');

    this.char_data = {};
    this.level_data = {};
    this.players = {};
    this.players_display_order = [];
    this.players_pick_order = [];
    this.characters = [];
    this.stages = [];

    // @todo: Determine if we still need to have these unique hashes. Probably
    // @todo: not, once we have real sessions going. But we can use this to
    // @todo: create session IDs.
    this.gameId = this.constructor.generateGameId();

    this.setupBoard(options);

    return this;
  }

  async setupBoard(options = {}) {
    for (let option in options) {
      if (this.hasOwnProperty(option)) {
        this[option] = options[option];
      }
    }

    // Load characters from the character data file.
    this.buildAllCharacters(SmashCrowd.getCharacters());
    this.buildAllStages(SmashCrowd.getStages());
    await this.loadPlayers();
  }

  loadBoard(boardId) {
    return new Promise(resolve => {
      SmashCrowd.loadBoard(boardId)
        .then(boardData => {
          this.setupBoard(boardData)
            .then (() => {
              this.setupByStatus();

              resolve();
            });
        });
    });
  }

  updateBoardRow(fieldvalues) {
    SmashCrowd.dbUpdate('boards', fieldvalues, `id = "${this.getId()}"`);
  }

  setId(boardId) {
    this.id = boardId;
  }
  getId() {
    return this.id;
  }

  setName(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }

  setOwner(userId) {
    this.owner = userId;
  }
  getOwner() {
    return this.owner;
  }

  setTotalRounds(rounds) {
    this.total_rounds = parseInt(rounds);
  }
  getTotalRounds() {
    return this.total_rounds;
  }

  startDraft() {
    this.draft.startByStatus('draft', this)
    this.advanceDraftRound();
  }
  advanceDraftRound() {
    if (this.current_draft_round === 0) {
      this.setStatus('draft');
    }
    return ++this.current_draft_round;
  }
  getDraftRound() {
    return this.current_draft_round;
  }
  resetDraftRound() {
    const activePlayer = this.getActivePlayer();
    if (activePlayer !== null) {
      activePlayer.setActive(false);
    }
    this.current_draft_round = 0;
  }

  advanceGameRound() {
    this.draft.advanceGame();
    if (this.current_game_round === 0) {
      this.setStatus('game');
    }
    return ++this.current_game_round;
  }
  getGameRound() {
    return this.current_game_round;
  }
  resetGameRound() {
    const activePlayer = this.getActivePlayer();
    if (activePlayer !== null) {
      activePlayer.setActive(false);
    }
    this.current_game_round = 0;
  }

  advancePick() {
    return ++this.current_pick;
  }
  getPick() {
    return this.current_pick;
  }
  resetPick() {
    this.current_pick = 0;
  }

  getStateTypes() {
    return this.draft.getStateTypes();
  }

  setDraft(type) {
    if (this.draftTypes.indexOf(type) > -1) {
      const Draft = require(`./../plugins/drafts/smashcrowd-${type}Draft.js`);
      this.draft = new Draft;

      this.draftType = type;
    }
    else {
      throw "Tried to set nonexistent draft type.";
    }
  }
  /**
   * Returns the current draft type, or the machine name of it.
   *
   * @param {boolean} userFriendly
   * @returns {number|string}
   */
  getDraftType(userFriendly = false) {
    let type = this.draftType;
    if (userFriendly) {
      type = this.draft.machine_name;
    }
    return type;
  }

  /**
   * Returns the full object for the current draft type.
   * @returns {DraftAbstract}
   */
  getDraft() {
    return this.draft;
  }

  setupByStatus() {
    this.draft.setupByStatus(this.getStatus(true), this);
  }

  setStatus(state) {
    if (typeof state === 'string') {
      const found = this.draft.statusTypes.indexOf(state);
      if (found === undefined ) {
        throw "Tried to set nonexistent board status.";
      }
      else {
        this.setStatus(found);
      }
    }
    else if (Number.isInteger(state)) {
      this.status = state;
      this.updateBoardRow({status: state});
    }

  }
  /**
   * State is a basic string that is dependant upon the draft type.
   *
   * @see ./smashcrowd-draftfactory.js
   *
   * @param {boolean} userFriendly
   *   Whether to return the string version or the integer version.
   * @returns {integer|string}
   */
  getStatus(userFriendly = false) {
    let status = this.status;
    if (userFriendly) {
      status = this.draft.statusTypes[this.status];
    }
    return status;
  }
  /**
   * Checks if the current status is either the string or int provided, or if it
   * is in the array provided.
   *
   * @param {string|integer|array} state
   *   Optional parameter
   * @returns {boolean}
   */
  checkStatus(state) {
    let isStatus = false;
    if (typeof state === 'string') {
      isStatus = this.draft.statusTypes[this.status] === state;
    }
    else if (Number.isInteger(state)) {
      isStatus = this.status === state;
    }
    else if (Array.isArray(state)) {
      if (typeof state[0] === 'string') {
        isStatus = state.includes(this.status);
      }
      else {
        isStatus = (this.status in state);
      }
    }
    return isStatus;
  }

  /**
   * Add a player to the players array.
   *
   * @param player
   */
  addPlayer(player) {
    const player_id = player.getId();
    player.setBoardId(this.getId());
    this.players[player_id] = player;

    // If the player already existed or otherwise had information, use that to
    // determine sort order (and color number);
    let pick_order = player.getPickOrder();
    let display_order = player.getDisplayOrder();

    // Pick order affects what order players appear in column-wise, and, obviously,
    // what order they pick characters in (if any).
    if (pick_order !== null) {
      this.players_pick_order[pick_order] = player;
    }
    else {
      this.players_pick_order.push(player);
      pick_order = this.players_display_order.length - 1;
      player.setPickOrder(pick_order);
    }

    // Display order affects which colors players get; these should remain
    // constantly through reordering (and server reloads).
    if (display_order !== null) {
      this.players_display_order[display_order] = player;
    }
    else {
      this.players_display_order.push(player);
      display_order = this.players_display_order.length - 1;
      player.setDisplayOrder(display_order);

      SmashCrowd.updatePlayer(player_id, {'display_order': display_order});
    }
  }

  /**
   * Requests players from the database and takes ownership of them.
   *
   * @returns {Promise<any>}
   */
  loadPlayers() {
    return new Promise(resolve => {
      SmashCrowd.loadPlayersByBoard(this.getId())
        .then(players => {
          for (let player of players) {
            this.addPlayer(player);
          }
          resolve();
        });
    });
  }
  updatePlayer(playerId, data) {
    for (let option in data) {
      this.players[playerId][option] = data[option];
    }
  }
  getPlayers() {
    return this.players;
  }
  getPlayersCount() {
    return Object.keys(this.players).length;
  }
  getPlayersDisplayOrder() {
    return this.players_display_order;
  }
  getPlayersPickOrder() {
    return this.players_pick_order;
  }
  /**
   * Searches the players array for the player with the matching ID.
   *
   * @param {integer} playerId
   *    The ID to look for.
   * @returns {Player|null}
   */
  getPlayer(playerId) {
    return this.players.hasOwnProperty((playerId)) ? this.players[playerId] : null;
  }
  getPlayerByPickOrder(currentPick) {
    return this.players_pick_order[currentPick];
  }
  resetPlayers() {
    for (let playerId in this.players) {
      this.players[playerId].setCharacters([]);
    }
  }

  /**
   * Combines a player with a character both in object and in the database.
   *
   * @param {Player} player
   * @param {Character} character
   */
  static addCharacterToPlayer(player, character) {
    const player_characters = player.addCharacter(character);

    SmashCrowd.addCharacterToPlayer(player.getId(), character.getId(), player_characters.length - 1)
  }

  /**
   * Removes a player from the game, taking care of minutia to ensure nothing
   * breaks.
   *
   * @param {integer} playerId
   */
  dropPlayer(playerId) {
    const playerPickIndex = this.players_pick_order.findIndex(player => {
      return player.getId() === playerId;
    });
    const playerDisplayIndex = this.players_display_order.findIndex(player => {
      return player.getId() === playerId;
    });

    const droppedPlayer = this.players[playerId];

    // If this is the active player, we need to either advance the game or draft
    // round to allow game to continue.
    if (droppedPlayer.isActive) {
      if (this.checkStatus('draft')) {
        this.advanceDraftRound();
      }
      else if (this.checkStatus('game')) {
        this.advanceGameRound();
      }
    }

    delete this.players[playerId];
    this.players_pick_order.splice(playerPickIndex, 1);
    this.players_display_order.splice(playerDisplayIndex, 1);
  }
  dropAllPlayers() {
    this.players = {};
    this.players_display_order = [];
    this.players_pick_order = [];
  }

  reversePlayersPick() {
    this.players_pick_order.reverse();
  }

  /**
   * Takes the current list of players and randomizes their order.
   *
   * Maintains basic integer for the order, which is why we involve a few extra
   * steps.
   */
  shufflePlayers() {
    // Create a new array that will hold the player sorts.
    const playerOrder = [];
    this.players_pick_order = [];

    // Shuffle the players.
    for (let playerId in this.players) {
      if (this.players.hasOwnProperty(playerId)) {
        playerOrder.push({
          id: playerId,
          place: Math.random(),
        });
      }
    }
    // Sort the new array.
    playerOrder.sort((a, b) => {
      return a.place - b.place;
    });

    // Then based off of the sorting assign the new order.
    for (let i = 0; i < playerOrder.length; i++) {
      const playerId = playerOrder[i].id;

      this.players[playerId].setPickOrder(i);
      SmashCrowd.updatePlayer(playerId, {'pick_order': i});

      // And finally re-add to the pick order array.
      this.players_pick_order.push(this.players[playerId]);
    }
  }

  /**
   * Figure out which player's turn it is to pick a character.
   *
   * Currently this is locked to "Snake" draft, where the turn order flips every
   * round.
   *
   * @returns Player|null
   *   The player that should pick their character next, or null if no players.
   */
  getActivePlayer() {
    // Get the first player by default.
    let activePlayer = (Object.keys(this.players).length > 0 ? this.players[Object.keys(this.players)[0]] : null);

    // Loop through the users and find the active one.
    for (let player in this.players) {
      if (this.players[player].isActive) {
        activePlayer = this.players[player];
        break;
      }
    }
    return activePlayer;
  }

  /**
   * Generally only ran at the creation of a board, creates all of the options
   * for picking a character.
   * @param {Array} charData
   */
  buildAllCharacters(charData) {
    // Process characters from library, ensuring we don't reference the property.
    for (let i = 0; i < charData.length; i++) {
      let char_id = charData[i].id;
      this.char_data[char_id] = charData[i];
      this.addCharacter(char_id, new Character(char_id, charData[i]));
    }

    // End by adding the "no pick" option, for when users wish to/are forced to
    // sit out.
    this.char_data[999] = {
      'id': '999',
      'name': 'None',
      'image': 'images/cross.png',
    };
    this.addCharacter(999, new Character(999, this.char_data[999]));
  }

  /**
   * Add a character to the characters array.
   *
   * @param {integer} charId
   * @param {Character} character
   * @returns {number} Index of the character.
   */
  addCharacter(charId, character) {
    this.characters[charId] = character;
  }
  updateCharacter(charId, data) {
    for (let option in data) {
      this.characters[charId][option] = data[option];
    }
  }
  getCharacters() {
    return this.characters;
  }
  getCharacter(charId) {
    return this.characters[charId];
  }
  resetCharacters() {
    this.characters.forEach(character => {
      character.setPlayer(null);
    });
  }
  dropAllCharacters() {
    this.characters = [];
  }

  /**
   * Generally only ran at the creation of a board, creates all of the options
   * for picking a stage.
   * @param {Array} levelData
   */
  buildAllStages(levelData) {
    // Process characters from library.
    for (let i = 0; i < levelData.length; i++) {
      let stage_id = levelData[i].id;
      this.level_data[i] = levelData[i];
      this.addStage(stage_id, new Stage(stage_id, levelData[i]));
    }
  }

  /**
   * Add a stage to the stages array.
   *
   * @param {integer} stageId
   * @param {Stage} stage
   * @returns {number} Index of the stage.
   */
  addStage(stageId, stage) {
    this.stages[stageId] = stage;
  }
  updateStage(stageId, data) {
    for (let option in data) {
      this.stages[stageId][option] = data[option];
    }
  }
  getStages() {
    return this.stages;
  }
  getStage(stageId) {
    return this.stages[stageId];
  }
  resetStages() {
    this.stages.forEach(stage => {
      stage.setState(null);
      stage.setPlayers([]);
    });
  }
  dropAllStages() {
    this.stages = [];
  }

  getGameId() {
    return this.gameId;
  }

  resetGame() {
    // Currently players get erased when we reset the board, since we don't have a
    // way to remove a single player. Eventually we should reset this by just running
    // resetPlayers().
    this.resetPlayers();
    this.resetCharacters();
    this.resetDraftRound();
    this.resetGameRound();
    this.resetPick();
    this.setStatus('new');
    this.gameId = this.constructor.generateGameId();
  }

  static generateGameId() {
    return Math.random().toString(36).replace('0.', '');
  }

}

module.exports = Board;
