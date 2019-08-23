/**
 * Definition of Free Draft.
 *
 * Allows players to pick as many characters as they want, with no
 * restrictions. Good for planning ahead for what character will play which
 * ahead of time.
 *
 * Free Draft does not allow the game to start until all players have picked
 * the same amount of characters.
 */

const DraftAbstract = require('./../../factories/smashcrowd-draftfactory');
const Character = require('./../../factories/smashcrowd-characterfactory');
const Board = require('./../../factories/smashcrowd-boardfactory');

class freeDraft extends DraftAbstract {
  constructor() {
    super();
    this.machine_name = 'free';
    this.label = 'Free Pick';
  }

  startNew(board) {
  }

  startDraft(board) {
    const players = board.getPlayers();
    for (let player in players) {
      players[player].setActive(true);
    }
  }

  addCharacter(board, player, character) {

    const charId = character.getId();

    // First check to make sure the default Draft checks succeed.
    const return_data = super.addCharacter(board, player, character);

    if (return_data.type === 'success') {
      const charId = character.getId();
      const return_data = {};
      character = new Character(charId, board.char_data[charId]);

      if (!player.isActive) {
        return_data.type = 'error';
        return_data.error = 'error_add_char_max_characters';
        return_data.message = 'You have reached the maximum number of characters!';
      }
      else {
        Board.addCharacterToPlayer(player, character);
      }
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
   * Since free pick doesn't have a nice, easy draft count of rounds when picking,
   * we need to track how many characters each player has added, and update the
   * board info/state if they've all picked.
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

    // If the board has a round total, and the player's character count is at that
    // level, stop them from adding more.
    clientplayer.setActive((!board.getTotalRounds() || clientplayer.getCharacterCount() < board.getTotalRounds()));

    // Disable/Enable picking for this user if the above conditions are met.
    returned_functions.push({'updateCharactersSingle': [client, {allDisabled: !clientplayer.isActive}]});

    updatedPlayers.push({
      'playerId': clientplayer.getId(),
      'isActive': clientplayer.isActive,
    });

    returned_functions.push({'updatePlayersInfo': [board, updatedPlayers]});

    // If any single player is not yet ready, don't update the board info.
    let draftComplete = true;
    let maxRounds = board.getMaxRounds();
    for (let playerId in board.getPlayers()) {
      const player = board.getPlayer(playerId);
      if (player.getCharacterCount() < maxRounds) {
        draftComplete = false;
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

}

module.exports = freeDraft;
