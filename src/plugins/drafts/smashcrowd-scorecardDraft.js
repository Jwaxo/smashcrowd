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
  }

  startNew(board) {
  }

  /**
   *
   * @param {Board} board.
   */
  startDraft(board) {
    board.setTotalRounds(board.getTotalRounds() + 1);
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
    const updatedPlayers = [];
    const clientplayer = client.getPlayerByBoard(board.getId());
    const returned_functions = [];

    updatedPlayers.push({
      'playerId': clientplayer.getId(),
    });

    // Ensure that we send "updateCharactersSingle" info to the client that just
    // picked a character so that, after processing, their character board re-
    // enables.
    returned_functions.push({'updateCharactersSingle': [client, {allDisabled: false}]});
    returned_functions.push({'updatePlayersInfo': [board, updatedPlayers]});

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
    // In addition to standard game advancing, we want to be sure to regenerate
    // characters, since they probably are re-enabling after we pick a winner.
    const returned_functions = super.advanceGame(board);

    returned_functions.push({'regenerateCharacters': [board]});

    return returned_functions;
  }

  startGameComplete(board) {
    // Since scorecards are just ongoing, we don't actually reach a "stop this
    // draft" point, and instead just loop back to drafting.
    board.setStatus('draft');
    board.startDraft();
  }
}

module.exports = scorecardDraft;
