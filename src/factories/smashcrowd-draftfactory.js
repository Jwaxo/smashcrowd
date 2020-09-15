/**
 * Abstract definition of a Draft and what kind of functions it requires.
 *
 * Drafts are not meant to store information, and could probably be entirely made
 * out of static functions, if not for the fact that they store a few things like
 * labels and status types. All information about the current state of the draft,
 * what characters are where, and what to do next, should all be stored by the
 * board itself that has a draft type.
 *
 * Any extension of this class should work like a factory or a widget: taking
 * information, bending it and shaping it, then sending information back based
 * off of that. In this way we can maintain that the information will always be
 * the same, and the draft types (which are complicated enough) won't have to
 * "hold" the information which may get confusing for the individual debugger.
 * Plus, it keeps the database information a lot more simple: boards are all
 * comparable, it's just how that information changes between steps that
 * differentiates Drafts.
 */

const Character = require('./smashcrowd-characterfactory');

class DraftAbstract {
  constructor() {
    this.machine_name = null;
    this.label = null;
    this.statusTypes = [
      'new',
      'draft',
      'draft-complete',
      'game',
      'game-complete',
    ];
    this.status = null;

    if (new.target === DraftAbstract) {
      throw new TypeError("Cannot construct Abstract classes directly.");
    }
  }

  getMachineName() {
    return this.machine_name;
  }
  getLabel() {
    return this.label;
  }
  getStatusTypes() {
    return this.statusTypes;
  }
  getStatus() {
    return this.status;
  }

  /**
   * Probably the most basic implementation of a unique Draft, what happens when
   * a player picks a character.
   *
   * There are a number of basic things that most drafts will do when they advance,
   * but since that's a vital part of any draft that it will be customized, I'm
   * okay with having some copy-pasting between drafts so that we can require
   * every draft to have this function defined.
   *
   * @param {Board} board
   * @param {Client} client
   * @param {Object} additional_data
   * @returns {Array}
   *   An array of objects that follow the following structure:
   *     {callbackName : [argument1, argument2, argument, 3]}
   */
  advanceDraft(board, client, additional_data) {
    const returned_functions = [];

    throw new TypeError(this.constructor.name + " does not initialize function advanceDraft");

    return returned_functions;
  }

  /**
   * Advance the game by one round.
   *
   * This implementation is probably the least likely to be changed by a Draft
   * subclass, but types such as a Scorecard, which routinely goes through a
   * number of games, will want to overload this function.
   *
   * @param {Board} board
   */
  advanceGame(board) {
    const returned_functions = [];
    const round = board.advanceGameRound();

    if (round > board.getTotalRounds()) {
      board.setStatus('game-complete');
      this.startByStatus('game-complete', board);
    }

    // Go through all players and update their rosters.
    returned_functions.push({'regeneratePlayers': [board]});
    returned_functions.push({'regenerateBoardInfo': [board]});

    return returned_functions;
  }

  /**
   * Add a character to a player.
   *
   * Drafts may potentially have unique requirements when picking a character,
   * or may take unique actions after a character is picked.
   *
   * @param {Board} board
   * @param {Player} player
   * @param {Character} character
   * @returns {{
   *   type: string,
   *   log: string,
   * }}
   */
  addCharacter(board, player, character) {

    const return_data = {
      type: 'success',
      log: 'log_add_char',
    };

    if (board.getDraftRound() < 1) {
      return_data.type = 'error';
      return_data.error = 'error_add_char_not_drafting';
      return_data.message = 'Drafting has not yet begun. Be patient.';
    }
    if (player === null) {
      return_data.type = 'error';
      return_data.error = 'error_add_char_no_player';
      return_data.message = 'You must select a player before you can pick a character!';

    }

    return return_data;
  }

  /**
   * Implement a method to drop a character from the roster.
   *
   * By default, drafts don't have the option to drop characters.
   *
   * @param board
   * @param client
   * @param player
   * @param character_index
   * @returns {boolean}
   *   Whether or not a character was dropped.
   */
  dropCharacter(board, client, player, character_index) {
    return false;
  }

  /**
   * Various functions in drafts can be defined for `start` and `continue`.
   * To have a function be called when these states enter, create a function
   * with either `start` or `continue for the first part of the name, and a
   * CamelCase version of the draft state for the next. Example:
   * startDraftComplete()
   * continueGame()
   * etc.
   */

  /**
   * Resumes the local functions, if they exists, for a given draft state.
   *
   * @param {string} state
   * @param {board} board
   * @returns {*}
   */
  continueByStatus(state, board) {
    this.runStateFunction('continue', state);
  }
  /**
   * Initialize local functions, if they exist, for a given draft state.
   *
   * @param {string} state
   * @returns {*}
   */
  startByStatus(state, board) {
    this.runStateFunction('start', state, board);
  }

  /**
   *
   * @param {string} functionstring
   * @param {string} state
   * @returns {*}
   */
  runStateFunction(functionstring, state, board) {
    if (this.statusTypes.indexOf(state) < 0) {
      throw new TypeError(`"${state}" is not a valid state for ${this.constructor.name}`);
    }
    let functionName = `${functionstring}${camelcase_hyphens(state)}`;
    if (typeof this[functionName] === 'function') {
      return this[functionName](board);
    }
    else {
      throw new TypeError(`${this.constructor.name} does not initialize function ${functionName}`);
    }
  }

  toJSON() {
    return {
      machine_name: this.getMachineName(),
      label: this.getLabel(),
      status_types: this.getStatusTypes(),
      status: this.getStatus(),
    };
  }

}

/**
 * Uppercases the first character.
 *
 * @param {string} string
 * @returns {string}
 */
function uppercase_first(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function camelcase_hyphens(string) {
  const string_segments = Array.from(string.split('-'), segment => uppercase_first(segment));
  return string_segments.join('');
}

module.exports = DraftAbstract;
