/**
 * Definition of Snake Draft.
 *
 * Has each player go through the draft one-at-a-time, picking their characters
 * on a round-by-round basis.
 *
 * The "snake" comes from the fact that the order reverses itself after every
 * round of picking. If one were to list out the drafters in a list, and draw a
 * line through them in the order they pick characters, this results in a weaving
 * pattern that resembles a snake:
 *
 * [Tom]->-[Dick]->-[Harry]
 *                     |
 *                     v
 *                     |
 * [Tom]-<-[Dick]-<-[Harry]
 *   |
 *   v
 *   |
 * [Tom]->-[Dick]->-[Harry]--:3----< hsssssss
 *
 * @todo: add option for a game round to be played between each draft.
 */

const DraftAbstract = require('./../../factories/smashcrowd-draftfactory');
const Character = require('./../../factories/smashcrowd-characterfactory');
const Board = require('./../../factories/smashcrowd-boardfactory');

class snakeDraft extends DraftAbstract {
  constructor() {
    super();
    this.machine_name = 'snake';
    this.label = 'Snake Draft';
    this.isLimited = true;
  }

  startNew(board) {
  }

  startDraft(board) {
    // Only set the player with pick to active.
    board.getPlayerByPickOrder(board.getPick()).setActive(true);

    // Remove any characters from the board who are in use by setting their player.
    for (let player of board.getPlayersArray()) {
      const characters = player.getCharacters();
      for (let character of characters) {
        character.setPlayer(player.getId());
      }
    }

  }

  addCharacter(board, player, character) {
    // In some strange cases the ID is returning null, so we're going to make
    // sure an error pops up to troubleshoot.
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
        returned_functions.push({'regenerateBoardInfo': [board]});
      }

      const currentPlayer = board.getPlayerByPickOrder(board.getPick());

      // We only need to change active state if the player changes.
      if (prevPlayer !== currentPlayer) {
        // Make sure the characters stay disabled, since this player is no longer
        // active.

        prevPlayer.setActive(false);
        currentPlayer.setActive(true);
      }

      returned_functions.push({'regeneratePlayers': [board]});
      returned_functions.push({'regenerateCharacters': [board]});
    }

    return returned_functions;
  }

  startDraftComplete(board) {

  }

  startGame(board) {

  }
}

module.exports = snakeDraft;
