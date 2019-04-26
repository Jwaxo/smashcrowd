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
    SmashCrowd.loadDraftTypes()
      .then(draftTypes => {
        this.draftTypes = draftTypes;
      });

    this.statusTypes = [
      'new',
      'draft',
      'draft-complete',
      'game',
      'game-complete',
    ];

    this.owner = 0;
    this.current_pick = 0;
    this.current_draft_round = 0;
    this.current_game_round = 0;
    this.total_rounds = 0;
    this.draftType = 1;
    this.name = null;
    this.status = 0;
    this.next_player_id = 0;

    this.char_data = {};
    this.level_data = {};
    this.players = [];
    this.players_pick_order = [];
    this.characters = [];
    this.stages = [];

    for (let option in options) {
      this[option] = options[option];
    }

    // SmashCrowd.addBoard(this);

    // @todo: Determine if we still need to have these unique hashes. Probably
    // @todo: not, once we have real sessions going. But we can use this to
    // @todo: create session IDs.
    this.gameId = this.constructor.generateGameId();

    for (let option in options) {
      if (this.hasOwnProperty(option)) {
        this[option] = options[option];
      }
    }

    return this;
  }

  loadBoard(boardId) {
    return new Promise(resolve => {
      SmashCrowd.loadBoard(boardId)
        .then(boardData => {
          for (let option in boardData) {
            this[option] = boardData[option];
          }

          // @todo: For now, we set this to blank manually. Needs to be replaced
          // @todo: with actual saved data info.

          this.char_data = {};
          this.level_data = {};
          this.players = [];
          this.players_pick_order = [];
          this.characters = [];
          this.stages = [];
          resolve();
        });
    });
  }

  updateBoardRow(fieldvalues) {
    SmashCrowd.dbUpdate('boards', fieldvalues, `id = "${this.getId()}`);
  }

  setId(boardId) {
    this.boardId = boardId;
  }
  getId() {
    return this.boardId;
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
    this.getActivePlayer().setActive(false);
    this.current_draft_round = 0;
  }

  advanceGameRound() {
    if (this.current_game_round === 0) {
      this.setStatus('game');
    }
    return ++this.current_game_round;
  }
  getGameRound() {
    return this.current_game_round;
  }
  resetGameRound() {
    this.getActivePlayer().setActive(false);
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

  setDraftType(type) {
    if (this.draftTypes.hasOwnProperty(type)) {
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
      type = this.draftTypes[this.draftType].machine_name;
    }
    return type;
  }

  /**
   * Returns the full info for the current draft type.
   * @returns {Object}
   */
  getDraftTypeInfo() {
    return this.draftTypes[this.draftType];
  }

  setStatus(state) {
    if (typeof state === 'string') {
      const found = this.statusTypes.findIndex(state);
      if (found === undefined ) {
        throw "Tried to set nonexistent board status.";
      }
      else {
        this.setStatus(found);
      }
    }
    else if (Number.isInteger(state)) {
      this.updateBoardRow({status: state});
      return this.status === state;
    }

  }
  /**
   * State is normally stored via an integer, but the string version is much easier
   * to understand, so for code visibility we allow it to be stored or checked
   * either way. The DB stores it via int.
   *
   * @param {boolean} userFriendly
   *   Whether to return the string version or the integer version.
   * @returns {integer|string}
   */
  getStatus(userFriendly = false) {
    let status = this.status;
    if (userFriendly) {
      status = this.statusTypes[this.status];
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
      isStatus = this.statusTypes[this.status] === state;
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
   * @returns {number} Index of the player.
   */
  addPlayer(player) {
    this.players.push(player);
    this.players_pick_order.push(player);
    player.setId(this.next_player_id++);
    player.setSortOrder(player.getId()); // Sort by ID by default.

    return player.getId();
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
    return this.players.length;
  }
  getPlayersPickOrder() {
    return this.players_pick_order;
  }
  /**
   * Searches the players array for the player with the matching ID.
   *
   * @param {integer} playerId
   *    The ID to look for.
   * @returns {integer|null}
   */
  getPlayerById(playerId) {
    const player = this.players.find(player => {
      return player.getId() === playerId;
    });
    return player ? player : null;
  }
  getPlayerByPickOrder(currentPick) {
    return this.players_pick_order[currentPick];
  }
  resetPlayers() {
    this.players.forEach(player => {
      player.setCharacters([]);
    });
  }

  /**
   * Removes a player from the game, taking care of minutia to ensure nothing
   * breaks.
   *
   * @param {integer} playerId
   */
  dropPlayerById(playerId) {
    const playerIndex = this.players.findIndex(player => {
      return player.getId() === playerId;
    });
    const playerPickIndex = this.players_pick_order.findIndex(player => {
      return player.getId() === playerId;
    });

    const droppedPlayer = this.players[playerIndex];

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

    this.players.splice(playerIndex, 1);
    this.players_pick_order.splice(playerPickIndex, 1);
  }
  dropAllPlayers() {
    this.players = [];
    this.players_pick_order = [];
  }

  reversePlayersPick() {
    this.players_pick_order.reverse();
  }

  /**
   * Takes the current list of players and randomizes their order.
   */
  shufflePlayers() {
    this.players.forEach(player => {
      player.setSortOrder(Math.random());
    });

    // After assigning new sort order, sort both players and pick order.
    this.players.sort((a, b) => {
      return a.getSortOrder() - b.getSortOrder();
    });
    this.players_pick_order.sort((a, b) => {
      return a.getSortOrder() - b.getSortOrder();
    });
  }

  /**
   * Figure out which player's turn it is to pick a character.
   *
   * Currently this is locked to "Snake" draft, where the turn order flips every
   * round.
   *
   * @returns Player
   *   The player that should pick their character next.
   */
  getActivePlayer() {
    let activePlayer = this.players[0];
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].isActive) {
        activePlayer = this.players[i];
        break;
      }
    }
    return activePlayer;
  }


  /**
   * Easy way to run functions for all players on the board with a break and return
   * value, which normal Array.forEach() functions cannot do.
   *
   * Possible forms:
   *   eachPlayer(callback)
   *   eachPlayer(args, callback)
   *   eachPlayer(args, returnValue, callback)
   *
   * @param {Array|function} args
   *   An optional array of arguments to pass to fn.
   * @param {*} returnValue
   *   A optional value to be returned by the function. Note that this is also
   *   measured as a means to break the loop; if this ever returns True, you get
   *   an early return.
   * @param {function|null} fn
   *   The function to run on each Player. If this function returns a truthy value,
   *   the loop will be broken at that point, and that truthy value will be passed
   *   back.
   */
  eachPlayer(args, returnValue = false, fn = null) {
    const compareObject = {};
    // If the user sent only a function, ensure fn is the function.
    if (typeof args === 'function' && returnValue === false && fn === null) {
      fn = args;
    }
    // If the user sent args and a function, ensure fn is the function and the
    // return is the default.
    else if (Array.isArray(args) && typeof returnValue === 'function' && fn === null) {
      fn = returnValue;
      returnValue = false;
    }
    for (let i = 0; i < this.players.length; i++) {
      if (Array.isArray(args)) {
        returnValue = fn(this.players[i], ...args, compareObject);
      }
      else {
        returnValue = fn(this.players[i], compareObject);
      }

      if (returnValue) {
        break;
      }
    }

    return returnValue;
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
      this.char_data[i] = charData[i];
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
