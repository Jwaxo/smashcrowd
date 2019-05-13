/**
 * Abstract definition of a Draft and what kind of functions it requires.
 */

const DraftAbstract = require('./../../factories/smashcrowd-draftfactory');
const Character = require('./../../factories/smashcrowd-characterfactory');
const Board = require('./../../factories/smashcrowd-boardfactory');

class snakeDraft extends DraftAbstract {
  constructor() {
    super();
    this.machine_name = 'snake';
    this.label = 'Snake Draft';
  }

  startNew(board) {
  }

  startDraft(board) {
    board.getPlayerByPickOrder(0).setActive(true);
  }

  addCharacter(board, player, character) {
    const charId = character.getId();

    // First check to make sure the default Draft checks succeed.
    const return_data = super.addCharacter(board, player, character);

    if (return_data.type === 'success') {
      if (charId === 999) {
        character = new Character(999, board.char_data[999]);
      }

      if (!player.isActive) {
        return_data.type = 'error';
        return_data.error = 'error_add_char_not_turn';
        return_data.message = 'It is not yet your turn! Please wait.';
      }
      else {

        // We can add the character!
        return_data.log = 'log_add_char';

        Board.addCharacterToPlayer(player, character);

        // By default we'll only be disabling the character selection until
        // processing has finished and the client has been updated.
        return_data.data = {
          'allDisabled': false,
        };

        // If the player didn't pick the "sit out" option, remove it from the roster.
        if (charId !== 999) {
          character.setPlayer(player.getId());

          return_data.data.chars = [
            {
              'charId': charId,
              'disabled': true,
            },
          ];
        }
      }
    }

    return return_data;
  }

  advanceDraft(board, client, characterUpdateData) {

    const prevPlayer = board.getActivePlayer();
    const updatedPlayers = [];
    const returned_functions = [];

    // @todo: this should probably be done outside of the draft object.
    if (board.getDraftRound() === 1 && board.getPick() === 0) {
      // If this is the first pick of the game, tell clients so that we can update
      // the interface.
      returned_functions.push({'setStatusAll': ['Character drafting has begun!', 'success']});
    }

    // This boolean tells us if the most recent pick ended the round.
    // If players count goes evenly into current pick, we have reached a new round.
    const newRound = (board.advancePick() % board.getPlayersCount() === 0);

    // If our round is new and the pre-advance current round equals the total, end!
    if (newRound && board.getDraftRound() === board.getTotalRounds()) {
      returned_functions.push({'serverLog': [`Drafting is now complete!`]});
      board.getActivePlayer().setActive(false);
      board.setStatus('draft-complete');
      returned_functions.push({'regenerateBoardInfo': [board]});
      returned_functions.push({'regeneratePlayers': [board]});
      returned_functions.push({'regenerateCharacters': [board]});
    }
    else {
      // On with the draft!
      if (newRound) {
        returned_functions.push({'serverLog': [`Round ${board.getDraftRound()} completed.`]});
        board.advanceDraftRound();
        board.reversePlayersPick();
        board.resetPick();
      }

      const currentPlayer = board.getPlayerByPickOrder(board.getPick());

      // We only need to change active state if the player changes.
      if (prevPlayer !== currentPlayer) {
        // Make sure the characters stay disabled, since this player is no longer
        // active.
        characterUpdateData.allDisabled = true;

        prevPlayer.setActive(false);
        currentPlayer.setActive(true);

        updatedPlayers.push({
          'playerId': currentPlayer.getId(),
          'isActive': true,
        });
      }

      // If we're at a new round in snake draft we need to regenerate the player
      // area entirely so that they reorder. Otherwise just update stuff!
      if (newRound && board.getDraftType() === 'snake') {
        returned_functions.push({'regenerateBoardInfo': [board]});
        returned_functions.push({'regeneratePlayers': [board]});
      }
      else {
        updatedPlayers.push({
          'playerId': prevPlayer.getId(),
          'isActive': prevPlayer.isActive,
        });

        returned_functions.push({'updatePlayersInfo': [board, updatedPlayers]});
      }

      returned_functions.push({'updateCharacters': [characterUpdateData]});
    }

    return returned_functions;
  }
}

module.exports = snakeDraft;
