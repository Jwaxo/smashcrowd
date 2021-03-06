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

    this.id = null;
    this.owner = 0;
    this.current_pick = 0;
    this.current_draft_round = 0;
    this.current_game_round = 0;
    this.total_rounds = 0;
    this.name = null;
    this.status = 0;
    this.draft_type = '';
    this.next_player_id = 0;

    const draftTypes = SmashCrowd.getSystemValue('draft_types');
    this.draftTypes = {};

    if (Array.isArray(draftTypes) && draftTypes.length > 0) {
      for (let draft_type of draftTypes) {
        const draft_definition = require(`./../plugins/drafts/smashcrowd-${draft_type}Draft.js`);
        this.draftTypes[draft_type] = new draft_definition;
      }
    }

    this.draft = {};
    this.setDraft('free', true);

    this.char_data = {};
    this.level_data = {};
    this.players = {};
    this.players_display_order = [];
    this.players_pick_order = [];
    this.characters = [];
    this.stages = [];

    this.gameId = this.constructor.generateGameId();

    if (typeof options !== 'object') {
      this.loadBoard(options);
    }
    else {
      this.setupBoard(options);
    }

    return this;
  }

  setupBoard(options = {}) {
    for (let option in options) {

      if (options.hasOwnProperty("draft_type")) {
        this.setDraft(options.draft_type, true);
      }

      if (this.hasOwnProperty(option)) {
        this[option] = options[option];
      }
    }

    this.saveBoard();

    // Load characters from the character data file.
    this.buildAllCharacters(SmashCrowd.getCharacters());
    this.buildAllStages(SmashCrowd.getStages());
  }

  loadBoard(boardId) {
    return new Promise(resolve => {
      SmashCrowd.loadBoard(boardId)
        .then(boardData => {
          this.setupBoard(boardData);
          this.loadPlayers()
            .then(() => {
              this.setupDraftByStatus();

              resolve();
            });
        });
    });
  }

  saveBoard() {
    if (this.getId() === null) {
      SmashCrowd.createBoard(this);
    }
    else {
      this.updateBoard({
        name: this.getName(),
        owner: this.getOwner(),
        draft_type: this.getDraftType(),
        status: this.getStatus(),
        current_pick: this.getPick(),
        total_rounds: this.getTotalRounds(),
        current_draft_round: this.getDraftRound(),
        current_game_round: this.getGameRound(),
      });
    }
  }

  updateBoard(field_values) {
    if (this.getId() === null) {
      throw new Error('Trying to update a board with a null ID.');
    }
    SmashCrowd.updateBoard(this.getId(), field_values);
  }

  setId(boardId) {
    this.id = boardId;
  }
  getId() {
    return this.id;
  }

  setName(name) {
    this.name = name;
    this.updateBoard({name: name});
  }
  getName() {
    return this.name;
  }

  setOwner(userId) {
    this.owner = userId;
    this.updateBoard({owner: userId});
  }
  getOwner() {
    return this.owner;
  }

  setTotalRounds(rounds) {
    this.total_rounds = parseInt(rounds);
    this.updateBoard({total_rounds: rounds});
  }
  getTotalRounds() {
    return this.total_rounds;
  }

  /**
   * Gets the maximum number of rounds in this game.
   *
   * This differs from the "total_rounds" property, which is set at board creation,
   * and is a useless statistic if we're playing with an unlimited number of rounds
   * in this game.
   */
  getMaxRounds() {
    // If total rounds are set, return those. If it isn't, reduce the players
    // object to the maximum number of characters in every player. Whoever has
    // the most characters will be the max rounds we can play for.
    return this.total_rounds || Object.keys(this.players).reduce((previous_max, playerid) => {
      return Math.max(previous_max, this.players[playerid].getCharacterCount());
    });
  }

  startDraft() {
    this.setStatus('draft');
    this.draft.startByStatus('draft', this);
    this.advanceDraftRound();
  }
  advanceDraftRound() {
    if (this.current_draft_round === 0) {
      this.setStatus('draft');
    }
    this.current_draft_round++;
    this.updateBoard({current_draft_round: this.current_draft_round});

    return this.current_draft_round;
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
    this.updateBoard({current_draft_round: 0});
  }

  /**
   * Mark a player as having won a round. For hopefully obvious reasons, only
   * one player should win per round (until teams are implemented).
   *
   * @param {number} player_id
   * @param {number} roster
   * @param {boolean} skip_save
   */
  setPlayerWin(player_id, roster, skip_save = false) {
    const winnerPlayer = this.getPlayer(player_id);
    const character_index = roster - 1;
    const player_character_id = winnerPlayer.getCharacterByIndex(character_index).getPlayerCharacterId();
    winnerPlayer.addStat('game_score');
    winnerPlayer.setCharacterState(character_index, 'win');

    if (!skip_save) {
      SmashCrowd.updatePlayerCharacter(player_character_id, {'win': 1});
    }
    for (let board_player_id in this.getPlayers()) {
      const eachPlayer = this.getPlayer(board_player_id);
      if (eachPlayer.getId() !== player_id) {
        eachPlayer.addStat('lost_rounds');
      }
    }
  }

  advanceGameRound() {
    this.setStatus('game');
    this.current_game_round++;
    this.updateBoard({current_game_round: this.current_game_round});
    return this.current_game_round;
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
    this.updateBoard({current_game_round: 0});
  }

  advancePick() {
    this.current_pick++;
    this.updateBoard({current_pick: this.current_pick});

    return this.current_pick;
  }
  getPick() {
    return this.current_pick;
  }
  resetPick() {
    this.current_pick = 0;
    this.updateBoard({current_pick: 0});
  }

  getStateTypes() {
    return this.draft.getStateTypes();
  }

  getDraftTypes() {
    return this.draftTypes;
  }

  setDraft(type, skip_save = false) {
    if (this.draftTypes.hasOwnProperty(type)) {
      const Draft = require(`./../plugins/drafts/smashcrowd-${type}Draft.js`);
      this.draft = new Draft;

      this.draft_type = type;

      // If the board was just loaded, we are setting this only for internal purposes.
      if (!skip_save) {
        this.updateBoard({draft_type: type});
      }
    }
    else {
      throw "Tried to set nonexistent draft type.";
    }
  }
  /**
   * Returns the current draft type machine name.
   *
   * @returns {string}
   */
  getDraftType() {
    return this.draft_type;
  }

  /**
   * Returns the full object for the current draft type.
   * @returns {DraftAbstract}
   */
  getDraft() {
    return this.draft;
  }

  setupDraftByStatus() {
    this.draft.startByStatus(this.getStatus(true), this);
  }

  /**
   * Takes a string or int indicating a board status and updates the and stored status.
   *
   * @param {string|int} state
   */
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
      this.updateBoard({status: state});
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
        // If the first of the states is a string, we can assume all of them are,
        // and are thus the "user friendly" style of states.
        isStatus = state.includes(this.getStatus(true));
      }
      else {
        // Otherwise the caller must be using the integer version of states.
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
    const update_data = {};
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
      pick_order = this.players_pick_order.length - 1;
      player.setPickOrder(pick_order);

      update_data.pick_order = pick_order;
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

      update_data.display_order = display_order;

    }

    // If we had to assign any player data, make sure it gets saved to the DB.
    if (Object.keys(update_data).length > 0) {
      SmashCrowd.updatePlayer(player_id, update_data);
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

  /**
   * @returns {{}}
   */
  getPlayers() {
    return this.players;
  }
  /**
   * @returns {[]}
   */
  getPlayersArray() {
    return Object.values(this.players);
  }
  /**
   * @returns {int}
   */
  getPlayersCount() {
    return Object.keys(this.players).length;
  }
  /**
   * @returns {[]}
   */
  getPlayersDisplayOrder() {
    return this.players_display_order;
  }
  /**
   * @returns {[]}
   */
  getPlayersPickOrder() {
    return this.players_pick_order;
  }
  /**
   * Searches the players array for the player with the matching ID.
   *
   * @param {number} playerId
   *    The ID to look for.
   * @returns {Player|null}
   */
  getPlayer(playerId) {
    return this.players.hasOwnProperty((playerId)) ? this.players[playerId] : null;
  }
  getPlayerByPickOrder(currentPick) {
    return this.players_pick_order[currentPick];
  }
  getPlayerByUserId(userId) {
    let returnPlayer = null;
    for (let playerId in this.players) {
      if (this.players[playerId].getUserId() === userId) {
        returnPlayer = this.players[playerId];
        break;
      }
    }
    return returnPlayer;
  }
  resetPlayers() {
    for (let playerId in this.players) {
      this.players[playerId].setCharacters([]);
    }
    SmashCrowd.dropCharactersFromPlayers(this.getPlayersArray());
  }

  /**
   * Combines a player with a character both in object and in the database.
   *
   * @param {Player} player
   * @param {Character} character
   *
   * @returns {int} player_character_id
   */
  static addCharacterToPlayer(player, character) {
    const player_characters = player.addCharacter(character);
    character.setPlayer(player.getId());

    SmashCrowd.addCharacterToPlayer(player, character, player_characters.length - 1);
  }

  /**
   * Combines a player with a character both in object and in the database.
   *
   * @param {Player} player
   * @param {number} character_index
   *   The roster index of the character in the player's lineup.
   */
  static dropCharacterFromPlayer(player, character_index) {
    const character = player.dropCharacter(character_index);
    SmashCrowd.dropCharacterFromPlayer(character);
    character.setPlayer(null);

    SmashCrowd.updatePlayerRosterIndex(player);
  }

  /**
   * Combines a player with a stage both in object and in the database.
   *
   * @param {Player} player
   * @param {Stage} stage
   */
  static addStageToPlayer(player, stage) {
    player.addStage(stage);

    SmashCrowd.addStageToPlayer(player.getId(), stage.getId());
  }

  /**
   * Combines a player with a stage both in object and in the database.
   *
   * @param {Player} player
   * @param {Stage} stage
   */
  static dropStageFromPlayer(player, stage) {
    player.dropStage(stage);

    SmashCrowd.dropStageFromPlayer(player.getId(), stage.getId());
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
    this.updatePlayersPickOrder();
    this.players_display_order.splice(playerDisplayIndex, 1);
    this.updatePlayersDisplayOrder();

    SmashCrowd.dropPlayer(playerId);
  }
  dropAllPlayers() {
    this.players = {};
    this.players_display_order = [];
    this.players_pick_order = [];
    SmashCrowd.dropPlayersByBoard(this.getId());
  }

  reversePlayersPick() {
    this.players_pick_order.reverse();
    this.updatePlayersPickOrder();
  }

  updatePlayersPickOrder() {
    for (let i = 0; i < this.players_pick_order.length; i++) {
      const player = this.players_pick_order[i];
      player.setPickOrder(i);
      SmashCrowd.updatePlayer(player.getId(), {'pick_order': i});
    }
  }

  updatePlayersDisplayOrder() {
    for (let i = 0; i < this.players_display_order.length; i++) {
      const player = this.players_display_order[i];
      player.setDisplayOrder(i);
      SmashCrowd.updatePlayer(player.getId(), {'display_order': i});
    }
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

      // And finally re-add to the pick order array.
      this.players_pick_order.push(this.players[playerId]);
    }
    this.updatePlayersPickOrder();
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

  toJSON() {
    const draftTypes = [];
    for (const [draftName, draftDefinition] of Object.entries(this.getDraftTypes())) {
      draftTypes.push(draftDefinition.toJSON());
    }

    return {
      id: this.getId(),
      owner: this.getOwner(),
      current_pick: this.getPick(),
      current_draft_round: this.getDraftRound(),
      current_game_round: this.getGameRound(),
      total_rounds: this.getTotalRounds(),
      name: this.getName(),
      status: this.getStatus(true),
      draft: this.getDraft(),
      draft_type: this.getDraftType(),
      draftTypes,
    };
  }

  static generateGameId() {
    return Math.random().toString(36).replace('0.', '');
  }

}

module.exports = Board;
