/**
 * Abstract definition of a Draft and what kind of functions it requires.
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

  /**
   *
   * @param {Board} board
   * @param {Client} client
   * @returns {Array}
   *   An array of objects that follow the following structure:
   *     {callbackName : [argument1, argument2, argument, 3]}
   */
  advanceDraft(board, client, additional_data) {
    const returned_functions = [];

    throw new TypeError(this.constructor.name + " does not initialize function advanceDraft");

    return returned_functions;
  }

  advanceGame() {
    throw new TypeError(this.constructor.name + " does not initialize function advanceGame");
  }

  addCharacter(board, player, character) {
    throw new TypeError(this.constructor.name + " does not initialize function addCharacter");

    return {
      type: 'error',
      message: 'Please contact your administrator.',
      data: 'additional_data',
    }
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
