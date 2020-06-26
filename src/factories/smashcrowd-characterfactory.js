/**
 * Information and methods used for a character representation.
 */

const fs = require('fs');

class Character {
  constructor(charId, data) {
    this.charId = charId;
    this.setName(data.name);
    this.setImage(data.image);
    this.playerCharacterId = null;
    this.player = null;
    this.state = null;

    return this;
  }

  setId(charId) {
    this.charId = charId;
  }
  getId() {
    return this.charId;
  }

  setPlayerCharacterId(playerCharacterId) {
    this.playerCharacterId = playerCharacterId;
  }
  getPlayerCharacterId() {
    return this.playerCharacterId;
  }

  setName(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }

  /**
   * Sets the image for the character. If said image does not exist in the file
   * system in a publicly-accessible folder, it is set to null.
   *
   * @param {string} image
   */
  setImage(image) {
    if (image) {
      const imagestring = 'public/' + image;
      if (!fs.existsSync(imagestring)) {
        image = null;
      }
    }
    this.image = image;
  }
  getImage() {
    return this.image
  }

  setPlayer(playerId) {
    this.player = playerId;
  }
  getPlayer() {
    return this.player;
  }

  setState(state) {
    this.state = state;
  }
  getState() {
    return this.state;
  }

}

module.exports = Character;
