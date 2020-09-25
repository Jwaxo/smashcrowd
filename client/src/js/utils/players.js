/**
 * @file players.js
 *
 * Player-related utility functions.
 */

const playerUtils = {
  /**
   * Filters to a single Player object based off of a playerId, or null.
   *
   * @param playerId
   * @param players
   * @returns {Player|null}
   */
  getPlayerById: (playerId, players) => {
    // Search through the Players array and set current player to that one, then
    // pass that info up the line.
    let player = null;
    for (let i = 0; i < players.length; i++) {
      const testPlayer = players[i];
      if (testPlayer.hasOwnProperty('playerId') && testPlayer.playerId === playerId) {
        player = testPlayer;
        break;
      }
    }
    return player;
  }
};

export default playerUtils;
