/**
 * Information and methods used for a drafting board.
 */

const Character = require('./smashdown-characterfactory.js');
const fs = require('fs');

class Board {
  constructor(boardId, options) {
    this.boardId = boardId;

    this.currentPick = 0;
    this.currentDraftRound = 0;
    this.currentGameRound = 0;
    this.totalRounds = null;
    this.draftType = null;
    this.name = null;
    this.status = 'new';
    this.nextPlayerId = 0;

    this.charData = {};
    this.players = [];
    this.playersPickOrder = [];
    this.characters = [];

    this.gameId = this.generateGameId();

    /**
     * The types of drafts currently able to pick.
     * @todo: create a draftfactory, then plugin different draft types.
     */
    this.draftTypes = {
      snake: 'Snake Draft',
      free: 'Free Pick',
    };

    this.statusTypes = [
      'new',
      'draft',
      'draft-complete',
      'game',
      'game-complete',
    ];

    for (let option in options) {
      if (this.hasOwnProperty(option)) {
        this[option] = options[option];
      }
    }

    return this;
  }

  setId(boardId) {
    this.boardId = boardId;
  }
  getId() {
    return this.boardId;
  }

  setTotalRounds(rounds) {
    this.totalRounds = parseInt(rounds);
  }
  getTotalRounds() {
    return this.totalRounds;
  }

  advanceDraftRound() {
    if (this.currentDraftRound === 0) {
      this.setStatus('draft');
    }
    return ++this.currentDraftRound;
  }
  getDraftRound() {
    return this.currentDraftRound;
  }
  resetDraftRound() {
    this.currentDraftRound = 0;
  }

  advanceGameRound() {
    if (this.currentGameRound === 0) {
      this.setStatus('game');
    }
    return ++this.currentGameRound;
  }
  getGameRound() {
    return this.currentGameRound;
  }
  resetGameRound() {
    this.currentGameRound = 0;
  }

  advancePick() {
    return ++this.currentPick;
  }
  getPick() {
    return this.currentPick;
  }
  resetPick() {
    this.currentPick = 0;
  }

  setDraftType(type) {
    if (this.draftTypes.hasOwnProperty(type)) {
      this.draftType = type;
    }
    else {
      throw "Tried to set nonexistent draft type.";
    }
  }
  getDraftType(userFriendly = false) {
    let type = this.draftType;
    if (userFriendly) {
      type = this.draftTypes[this.draftType];
    }
    return type;
  }

  setStatus(status) {
    if (this.statusTypes.includes(status)) {
      this.status = status;
    }
    else {
      throw "Tried to set nonexistent board status.";
    }
  }

  /**
   * Either checks if the status is a particular string or, what it currently is.
   *
   * @param state
   * @returns {boolean|string|array}
   */
  getStatus(state = null) {
    if (typeof state === 'string') {
      return this.status === state;
    }
    else if (Array.isArray(state)) {
      return state.includes(this.status);
    }
    return this.status;
  }

  /**
   * Add a player to the players array.
   *
   * @param player
   * @returns {number} Index of the player.
   */
  addPlayer(player) {
    this.players.push(player);
    this.playersPickOrder.push(player);
    player.setId(this.nextPlayerId++);
    player.setSortOrder(player.getId()); // Sort by ID by default.

    return player.getId();
  }
  updatePlayer(playerId, data) {
    for (option in data) {
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
    return this.playersPickOrder;
  }
  getPlayerByPickOrder(currentPick) {
    return this.playersPickOrder[currentPick];
  }
  resetPlayers() {
    this.players.forEach(player => {
      player.setCharacters([]);
    });
  }
  dropAllPlayers() {
    this.players = [];
    this.playersPickOrder = [];
  }
  reversePlayersPick() {
    this.playersPickOrder.reverse();
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
    this.playersPickOrder.sort((a, b) => {
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
   * Searches the players array for the player with the matching ID.
   *
   * @param {integer|null} playerId
   *    The ID to look for.
   */
  getPlayerById(playerId) {
    let player = null;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].getId() === playerId) {
        player = this.players[i];
        break;
      }
    }
    return player;
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
   * @param charData
   */
  buildAllCharacters(charData) {
    this.charData = charData;
    // Process characters from library.
    for (let i = 0; i < this.charData.chars.length; i++) {
      this.addCharacter(i, new Character(i, this.charData.chars[i]));
    }

    // End by adding the "no pick" option, for when users wish to/are forced to
    // sit out.
    this.charData.chars[999] = {
      'name': 'None',
      'image': 'images/cross.png',
    };
    this.addCharacter(999, new Character(999, this.charData.chars[999]));
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
    for (option in data) {
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

  getGameId() {
    return this.gameId;
  }

  resetAll() {
    // Currently players get erased when we reset the board, since we don't have a
    // way to remove a single player. Eventually we should reset this by just running
    // resetPlayers().
    this.dropAllPlayers();
    this.resetCharacters();
    this.resetDraftRound();
    this.resetGameRound();
    this.resetPick();
    this.setStatus('new');
    this.gameId = this.generateGameId();
  }

  generateGameId() {
    return Math.random().toString(36).replace('0.', '');
  }

}

module.exports = Board;
