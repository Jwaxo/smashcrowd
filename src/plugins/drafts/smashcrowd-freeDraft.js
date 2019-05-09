/**
 * Abstract definition of a Draft and what kind of functions it requires.
 */

const DraftAbstract = require('./../../factories/smashcrowd-draftfactory.js');

class freeDraft extends DraftAbstract {
  constructor() {
    super();
    this.machine_name = 'free';
    this.label = 'Free Pick';
  }

  setupNew(board) {
  }

  startDraft(board) {
    const players = board.getPlayers();
    for (let player in players) {
      players[player].setActive(true);
    }
  }

  advanceDraft(board, client) {
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
