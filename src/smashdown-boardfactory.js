/**
 * Information and methods used for a drafting board.
 */
class Board {
  constructor(boardId, options) {
    this.boardId = boardId;

    this.resetPick();
    this.resetRound();
    this.totalRounds = null;
    this.draftType = null;
    this.name = null;

    this.players = [];
    this.playersPickOrder = [];
    this.characters = [];

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
  advanceRound() {
    return ++this.currentRound;
  }
  getRound() {
    return this.currentRound;
  }
  resetRound() {
    this.currentRound = 0;
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
    this.draftType = type;
  }
  getDraftType() {
    return this.draftType;
  }

  /**
   * Add a player to the players array.
   *
   * @param player
   * @returns {number} Index of the player.
   */
  addPlayer(player) {
    this.playersPickOrder.push(player);
    return this.players.push(player) - 1;
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
      player.sortOrder = Math.random();
      player.setActive(false);
    });

    // After assigning new sort order, sort both players and pick order.
    this.players.sort((a, b) => {
      return a.sortOrder - b.sortOrder;
    });
    this.playersPickOrder.sort((a, b) => {
      return a.sortOrder - b.sortOrder;
    });

    // Set the first player to be active again.
    this.players[0].setActive(true);
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

}

module.exports = {
  "createBoard": (...arguments) => {
    return new Board(...arguments);
  },
};
