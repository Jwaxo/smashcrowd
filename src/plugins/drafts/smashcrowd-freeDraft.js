/**
 * Abstract definition of a Draft and what kind of functions it requires.
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
    const return_data = {};
    character = new Character(charId, board.char_data[charId]);

    if (!player.isActive) {
      return_data['type'] = 'error';
      return_data['error'] = 'error_add_char_max_characters';
      return_data['message'] = 'You have reached the maximum number of characters!';
    }
    else {
      Board.addCharacterToPlayer(player, character);

      return_data['type'] = 'success';
      return_data['data'] = {};
    }

    return return_data;
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
    for (let playerId in board.getPlayers()) {
      const player = board.getPlayer(playerId);
      if (player.getCharacterCount() < board.getTotalRounds()) {
        draftComplete = false;
      }
    }

    if (draftComplete) {
      board.setStatus('draft-complete');
      returned_functions.push({'regenerateBoardInfo': [board]});
    }

    return returned_functions;
  }
}

module.exports = freeDraft;
