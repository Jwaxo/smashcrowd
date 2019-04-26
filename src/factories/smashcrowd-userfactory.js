/**
 * Information and methods to construct a user object for logging in and sessions.
 */

const bcrypt = require('bcrypt');
let SmashCrowd;

class User {

  constructor(db, crowd) {
    this.session = '';
    this.userId = null;
    this.email = null;
    this.username = null;

    SmashCrowd = crowd;

    return this;
  }

  setId(userId) {
    this.userId = userId;
  }
  getId() {
    return this.userId;
  }

  setEmail(email) {
    this.email = email;
  }
  getEmail() {
    return this.email;
  }

  setUsername(username) {
    this.username = username;
  }
  getUsername() {
    return this.username;
  }

  /**
   * Assuming successfully validated user info, creates the user.
   *
   * @param {string} email
   * @param {string} username
   * @param {string} password
   */
  registerUser(email, username, password) {
    this.setEmail(email);
    this.setUsername(username);
    SmashCrowd.addUser(this, this.constructor.passwordHash(password));
  }

  /**
   * Checks if given unique user information is already in the database.
   *
   * @param {string} email
   * @param {string} username
   * @returns {Promise<number>}
   *   The available state of the user.
   *     - 0: available
   *     - 1: username taken
   *     - 2: email taken
   */
  async static checkUserAvailable(email, username) {
    let available = 0;

    await Promise.all([
      new Promise(resolve => {
        SmashCrowd.dbSelect('user', 'username', `username = "${username}"`)
          .then(results => {
            if (results.length > 0) {
              available = 1;
            }
            resolve();
          });
      }),
      new Promise(resolve => {
        SmashCrowd.dbSelect('user', 'email', `email = "${email}"`)
          .then(results => {
            if (results.length > 0) {
              available = 2;
            }
            resolve();
          });
      }),
    ]);

    return available;
  }

  /**
   * Hash a given password with bcrypt methods and return the hash.
   *
   * @param {string} password
   * @returns {string}
   */
  static passwordHash(password) {
    bcrypt.hash(password, 10, (err, hash) => {
      password = hash;
    });
    return password;
  }

}

module.exports = User;
