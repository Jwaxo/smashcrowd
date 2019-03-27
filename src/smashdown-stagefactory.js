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

    this.players = [];

    return this;
  }

  setStageId(stageId) {
    this.stageId = stageId;
  }
  getStageId() {
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

  addPlayer(playerId) {
    this.players.push(playerId);
  }
  setPlayers(players) {
    this.players = players;
  }

}

module.exports = Stage;
