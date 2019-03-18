/**
 * Information and methods used for an individual user connection.
 */
class Client {
  constructor(socket, gameId) {
    this.id = 0;
    this.socket = socket;
    this.color = null;
    this.player = null;
    this.playerId = null;
    this.playerStorage = '';

    this.setGameId(gameId);

    return this;
  }

  // There shouldn't be a way to set the socket, since clients and sockets have
  // a 1:1 relationship. The only way to remove a socket is to drop it entirely,
  // and this should only be done for utility purposes.
  getSocket() {
    return this.socket;
  }

  setId(clientId) {
    this.id = clientId;
  }
  getId() {
    return this.id;
  }

  setColor(color) {
    this.color = color;
  }
  getColor() {
    return this.color;
  }

  /**
   * Store a Player in the client's information. The client's info gets passed
   * to the Player as well, but without passing the full object; this would cause
   * recursion and an infinite call stack.
   *
   * @param {Player|null} player
   *   The new player this client is assigned to. To remove a player from a client,
   *   pass in `null`.
   */
  setPlayer(player) {
    // If a player is already set, remove this client from it.
    if (this.player) {
      this.player.setClientId(0);
    }

    // Store the new player information and update said player, or just remove
    // the ID if we're wiping the player info.
    this.player = player;
    if (player) {
      this.playerId = player.getId();
      this.player.setClientId(this.id);
    }
    else {
      this.playerId = null;
    }

    this.updatePlayerStorage();
  }
  getPlayer() {
    return this.player
  }
  getPlayerId() {
    return this.playerId;
  }

  getLabel() {
    let label = '';
    if (this.player) {
      label = this.color(this.player.getName());
    }
    else {
      label = this.color(`Client ${this.id}`);
    }
    return label;
  }

  setGameId(gameId) {
    this.gameId = gameId;
    this.updatePlayerStorage();
  }
  getGameId() {
    return this.gameId;
  }

  updatePlayerStorage() {
    return this.playerStorage = 'smashcrowd-' + this.getGameId();
  }
  getPlayerCookie() {
    return this.playerStorage;
  }

}

module.exports = Client;
