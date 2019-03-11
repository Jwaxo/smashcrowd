/**
 * Information and methods used for a drafting board.
 */
class Board {
  constructor(boardId, options) {
    this.boardId = boardId;

    this.totalRounds = null;
    this.draftType = null;
    this.players = [];
    this.characters = [];
    this.currentRound = 1;
    this.currentPick = 0;
    this.name = null;

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

  setDraftType(type) {
    this.draftType = type;
  }
  getDraftType() {
    return this.draftType;
  }

}

module.exports = {
  "createBoard": (...arguments) => {
    return new Board(...arguments);
  },
};
