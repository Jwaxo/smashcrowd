/**
 * Information and methods used for a drafting board.
 */
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

    this.players = [];
    this.playersPickOrder = [];
    this.characters = [];

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
    this.totalRounds = rounds;
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
  getStatus() {
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
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].setCharacters([]);
    }
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
   * Add a character to the characters array.
   *
   * @param character
   * @returns {number} Index of the character.
   */
  addCharacter(character) {
    return this.characters.push(character) - 1;
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
  }

}

module.exports = Board;
