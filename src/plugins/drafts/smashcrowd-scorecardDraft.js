/**
 * Definition of Scorecard Drafting
 *
 * "Scorecard" is, essentially, the opposite of a draft: it's meant for keeping
 * track of wins and losses in an improvisational manner, with no planning of
 * rounds or characters beforehand.
 *
 * Because of this, scorecard goes through a "full board" in a single round, and
 * keeps the board's results for the next board.
 */

const DraftAbstract = require('./../../factories/smashcrowd-draftfactory');
const Character = require('./../../factories/smashcrowd-characterfactory');
const Board = require('./../../factories/smashcrowd-boardfactory');

class scorecardDraft extends DraftAbstract {
  constructor() {
    super();
    this.machine_name = 'scorecard';
    this.label = 'Score Card';
    this.is_infinite = false;
  }

  startNew(board) {
  }

  /**
   *
   * @param {Board} board.
   */
  startDraft(board) {
    // If the total rounds are 0, we're in "round by round" mode, and can just
    // keep adding 1 to the total rounds. The game is over when the players
    // designate it so.
    if (board.getTotalRounds() === 0) {
      this.is_infinite = true;
      board.setTotalRounds(1);
    }
    const players = board.getPlayers();
    for (let player in players) {
      players[player].setActive(true);
    }
  }

  /**
   * Picks a character and adds it to the next upcoming round for the player.
   * If the player already has a character for that round, replace it.
   *
   * @param {Board} board
   * @param {Player} player
   * @param {Character} character
   */
  addCharacter(board, player, character) {

    // First check to make sure the default Draft checks succeed.
    const return_data = super.addCharacter(board, player, character);

    if (return_data.type === 'success') {
      const charId = character.getId();
      character = new Character(charId, board.char_data[charId]);

      // Swap characters if we're at the maximum rounds.
      if (player.getCharacterCount() === board.getTotalRounds()) {
        // First remove the current character from the player's character array.
        // Player characters is a 0-indexed array, so it will always be one less
        // than the round we want to remove it from.
        Board.dropCharacterFromPlayer(player, board.getTotalRounds() - 1);
        return_data.log = 'log_switch_char';
      }
      Board.addCharacterToPlayer(player, character);

    }

    return return_data;
  }

  /**
   * Removes a character from a roster and updates draft status as necessary.
   *
   * @param {Board} board
   * @param {Client} client
   * @param {Player} player
   * @param {number} character_index
   *   The roster location the character occupies.
   * @returns {boolean}
   */
  dropCharacter(board, client, player, character_index) {
    Board.dropCharacterFromPlayer(player, character_index);

    // If the draft was marked complete, uncomplete it!
    if (board.checkStatus('draft-complete')) {
      board.setStatus('draft');
    }

    this.advanceDraft(board, client);

    return true;
  }

  /**
   * Drafting is complete once every player has chosen a character. Since we want
   * to allow changing of characters up until the game starts, we never set active
   * states or anything; we just check to make sure everyone has picked a character.
   *
   * @param {Board} board
   * @param {Client} client
   * @param {Object} unused
   * @returns {Array}
   *   Functions and arguments to run from the main server with draft calculations.
   */
  advanceDraft(board, client, unused = {}) {
    const returned_functions = [];

    // Ensure that we send "updateCharactersSingle" info to the client that just
    // picked a character so that, after processing, their character board re-
    // enables.
    returned_functions.push({'updateCharactersSingle': [client, {allDisabled: false}]});
    returned_functions.push({'regeneratePlayers': [board]});

    // If any single player is not yet ready, don't update the board info.
    let draftComplete = true;
    for (let playerId in board.getPlayers()) {
      const player = board.getPlayer(playerId);
      if (player.getCharacterCount() < board.getTotalRounds()) {
        draftComplete = false;
        break;
      }
    }

    if (draftComplete) {
      board.setStatus('draft-complete');
    }
    else {
      board.setStatus('draft');
    }
    returned_functions.push({'regenerateBoardInfo': [board]});

    return returned_functions;
  }

  startDraftComplete(board) {

  }

  startGame(board) {

  }

  advanceGame(board) {
    // This mostly runs the same as a default draft, with the exception being that
    // the game round only advances if it is not equal to the draft round.
    // If they are equal, we go back to the draft, and let it advance the game
    // round once drafting is complete.
    const returned_functions = [];

    if (board.getDraftRound() > board.getGameRound()) {
      // We just completed a draft, so we're ready to move on to picking a winner.
      board.advanceGameRound();
    }
    else {
      // We just completed a game round, so run the completion items.
      this.startByStatus('game-complete', board);
    }

    // Go through all players and update their rosters, as well as re-enable the
    // character selection.
    returned_functions.push({'regeneratePlayers': [board]});
    returned_functions.push({'regenerateBoardInfo': [board]});
    returned_functions.push({'regenerateCharacters': [board]});

    return returned_functions;
  }

  startGameComplete(board) {
    // Since scorecards with 0 rounds are ongoing, we don't actually reach a
    // "stop this draft" point, and instead just loop back to drafting.
    if (this.is_infinite) {
      board.setTotalRounds(board.getTotalRounds() + 1);
      board.startDraft();
    }
    else {
      board.setStatus('game-complete');
    }
  }
}

module.exports = scorecardDraft;
