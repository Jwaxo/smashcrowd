/**
 * Information and methods used for a single level in the game.
 */

const fs = require('fs');

class Stage {
  constructor(stageId, data) {
    this.stageId = stageId;
    this.setName(data.name);
    this.setImage(data.image);
    this.state = null;

    this.players = {};
    this.maxPlayers = 12; // Arbitrarily set based off of how many different positions we've manually created in the stylesheet.

    return this;
  }

  setId(stageId) {
    this.stageId = stageId;
  }
  getId() {
    return this.stageId;
  }

  setName(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }

  /**
   * Sets the image for the stage. If said image does not exist in the file
   * system in a publicly-accessible folder, it is set to null.
   *
   * @param {string} image
   */
  setImage(image) {
    if (image) {
      if (!fs.existsSync('public/' + image)) {
        image = null;
      }
    }
    this.image = image;
  }
  getImage() {
    return this.image
  }

  setState(state) {
    this.state = state;
  }
  getState() {
    return this.state;
  }

  addPlayer(player) {
    // Players are stored in one of twelve random positions, for fun placement of
    // "chosen" tokens.
    let openPositions = [];

    // Loop through the players and assign empty slots to the open positions array.
    for (let i = 0; i < this.maxPlayers; i++) {
      if (!this.players.hasOwnProperty(i)) {
        openPositions.push(i);
      }
    }

    const newPlayerIndex = openPositions[Math.floor(Math.random() * Math.floor(openPositions.length))];

    this.players[newPlayerIndex] = player;
  }
  dropPlayer(playerId) {
    for (let i = 0; i < this.maxPlayers; i++) {
      if (this.players.hasOwnProperty(i) && this.players[i].getId() === playerId) {
        delete this.players[i];
        break;
      }
    }
  }
  getPlayers() {
    return this.players;
  }
  getPlayerBySlot(slot){
    let player = null;
    if (this.players.hasOwnProperty(slot)) {
      player = this.players[slot];
    }
    return player;
  }
  getPlayerCount() {
    return Object.keys(this.players).length;
  }
  setPlayers(players) {
    this.players = players;
  }

}

module.exports = Stage;
