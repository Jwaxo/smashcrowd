/**
 * Information and methods used for an individual user connection.
 */
class Character {
  constructor(charId, data) {
    this.charId = charId;
    this.name = data.name;
    this.image = data.image;
    this.player = null;

    return this;
  }

  setCharId(charId) {
    this.charId = charId;
  }
  getCharId() {
    return this.charId;
  }

  setName(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }

  setImage(image) {
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

}

module.exports = {
  "createCharacter": (...arguments) => {
    return new Character(...arguments);
  },
};
