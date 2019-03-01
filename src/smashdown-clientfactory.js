/**
 * Information and methods used for an individual user connection.
 */
class Client {
  constructor(socket, color) {
    this.socket = socket;
    this.color = color;// Setting to Red by default for now.

    return this;
  }
}

module.exports = {
  "createClient": (...arguments) => {
    return new Client(...arguments);
  },
};
