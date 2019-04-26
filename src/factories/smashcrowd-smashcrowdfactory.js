/**
 * Logic, query, and other app-wide functions and services. This tracks all db
 * values and caches them, while also holding the functions to update the db.
 */

class Smashcrowd {

  /**
   *
   * @param {Connection} db
   * @param {Config} config
   */
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.system = {};
    this.characters = [];
    this.stages = [];
    this.users = {};
    this.boards = {};

    this.dbDiffString = this.constructor.constructDbDiffString(config.get('database.connection'));
  }

  static constructDbDiffString(db_connection) {
    return `mysql://${db_connection.user}:${db_connection.password}@${db_connection.host}/${db_connection.database}`;
  }
  getDbDiffString() {
    return this.dbDiffString;
  }

  /**
   * Handles selecting a single row from a table.
   *
   * @param {string} table
   * @param {array/string} fields
   *   Use a string for a single field, an array for multiple.
   * @param {string} where
   *   We could complicate this a lot but I'm keeping it simple.
   * @param {string} sort
   *   An optional sort string that follows the format of "[field] [direction]"
   * @returns {Promise<*>}
   *   A promise that resolves with a single object with parameters that match
   *   field: value
   */
  async dbSelectFirst(table, fields = '*', where = 1, sort = '') {
    return await this.dbSelect(table, fields, where, sort, 1);
  }

  /**
   * Handles selecting of many rows from a table.
   *
   * @param {string} table
   * @param {array/string} fields
   *   Use a string for a single field, an array for multiple.
   * @param {string} where
   *   We could complicate this a lot but I'm keeping it simple.
   * @param {string} sort
   *   An optional sort string that follows the format of "[field] [direction]"
   * @param {int} limit
   *   An optional sort string that follows the format of "[field] [direction]"
   * @returns {Promise<*>}
   *   A promise that resolves with an array of objects with parameters that
   *   match field: value
   */
  async dbSelect(table, fields = '*', where = 1, sort = '', limit = 0) {
    const sql = ['SELECT'];

    if (Array.isArray(fields)) {
      fields = `\`${fields.join('\`,\`')}\``;
    }

    sql.push(`${fields} FROM ??`); // Only adding the FROM using db.query replacement ensure it is escaped.
    sql.push(`WHERE ${where}`);

    if (sort !== '') {
      sql.push(`SORT BY ${sort}`);
    }
    if (limit !== 0) {
      sql.push(`LIMIT ${limit}`);
    }
    return new Promise(resolve => {
      this.db.query(sql.join(' '), [table], (error, results) => {

        if (error) {
          throw error;
        }

        resolve(results);
      });
    });
  }

  /**
   * Inserts one or more rows into a given table.
   *
   * @param {string} table
   * @param {Object/Array} fieldvalues
   *   Either an object built such that "[field]: [value]", or an array of such
   *   objects.
   * @returns {Promise<int>}
   */
  async dbInsert(table, fieldvalues) {
    const fields = [];
    const values = [];

    // Just in case an object was passed to us, put it in an array.
    if (!Array.isArray(fieldvalues)) {
      fieldvalues = [fieldvalues];
    }

    // All new rows should have the same properties, so grab them from the first.
    for (let field in fieldvalues[0]) {
      fields.push(`\`${field}\``);
    }

    // Finally build our array of value strings out of just the values of each row.
    fieldvalues.forEach((row) => {
      values.push(Object.values(row).join('","'));
    });

    return new Promise(resolve => {
      this.db.query(`INSERT INTO ?? (${fields.join(',')}) VALUES ("${values.join('"),("')}")`, [table], (error, results) => {
        if (error) {
          throw error;
        }

        resolve(results.insertId);
      });
    });
  }

  /**
   * Updates one or more rows on a given table.
   *
   * @param {string} table
   * @param {Object} fieldvalues
   *   An object of matching field names and expected values.
   * @param {string} where
   *   A MySQL WHERE statement to tell you when to update to these values.
   * @returns {Promise<*>}
   */
  async dbUpdate(table, fieldvalues, where) {
    // Build our arrays of field and value strings out of each row.
    const set = [];
    for (let field in fieldvalues) {
      set.push(`\`${field}\` = "${fieldvalues[field]}"`);
    }

    return new Promise(resolve => {
      this.db.query(`UPDATE ?? SET ${set.join(',')} WHERE ${where}`, [table], (error, results) => {
        if (error) {
          throw error;
        }

        resolve(results);
      });
    });
  }

  /**
   * Runs a series of queries, defined by normal MySQL strings.
   *
   * @param {Array} queries
   *   An array of strings that match MySQL syntax.
   * @returns {Promise<void>}
   *   A Promise that resolves when all queries are complete.
   */
  async dbQueries(queries) {
    for (const query of queries) {
      if (query.trim()) {
        await new Promise(resolve => {
          this.db.query(query, [], (error, results) => {
            if (error) {
              throw error;
            }

            resolve();
          });
        });
      }
    }
  }

  /**
   * Selects all of the rows in the `system` table and saves them to the property.
   * @returns {Promise<*>}
   */
  async setupSystem() {
    return await this.dbSelect('system')
      .then((results) => {
        results.forEach(result => {
          this.system[result.key] = result.value;
        });
      });
  }
  setSystemValue(key, value) {
    this.system[key] = value;
    this.dbUpdate('system', {'value': value}, `\`key\` = "${key}"`);
  }
  getSystemValue(key) {
    let value;
    if (this.system.hasOwnProperty(key)) {
      value = this.system[key];
    }
    else {
      value = null;
    }
    return value;
  }

  /**
   * Set characters in SmashCrowd main object. This is mostly used by boards as a
   * reference, so the DB doesn't have to be pinged.
   *
   * @param {Array} character_data
   *   Optional character data, if you already have it. Saves a DB query.
   * @returns {Promise<Array>}
   */
  async setupCharacters(character_data = null) {
    if (character_data == null) {
      await this.dbSelect('characters')
        .then((results) => {
          results.forEach(result => {
            this.characters.push({
              'id': result.id,
              'name': result.name,
              'image': result.image,
            });
          });
        });
    }
    else {
      this.characters = character_data;
    }
    return this.characters;
  }
  getCharacters() {
    return this.characters;
  }

  /**
   * Set stages in SmashCrowd main object. This is mostly used by boards as a
   * reference, so the DB doesn't have to be pinged.
   *
   * @param {Array} stage_data
   *   Optional stage data, if you already have it. Saves a DB query.
   * @returns {Promise<Array>}
   */
  async setupStages(stage_data = null) {
    if (stage_data == null) {
      await this.dbSelect('stages')
        .then((results) => {
          results.forEach(result => {
            this.stages.push({
              'id': result.id,
              'name': result.name,
              'image': result.image,
            });
          });
        });
    }
    else {
      this.stages = stage_data;
    }
    return this.stages;
  }
  getStages() {
    return this.stages;
  }

  /**
   * Set players in SmashCrowd iterator. This is mostly used by boards as a
   * reference, so the DB doesn't have to be pinged.
   *
   * @returns {Promise<Array>}
   */
  async setupUsers() {
    await this.dbSelect('users')
      .then(results => {
        results.forEach(result => {
          this.users[result.id] = result;
        });
      });
    return this.users;
  }
  addUser(user, password) {
    // This will insert a user, but currently we don't have anything actually registering users.
    return new Promise(resolve => {
      this.dbInsert('users', {
        username: user.getUsername(),
        email: user.getEmail(),
        password: password,
      })
        .then(userId => {
          this.users[userId] = user;
          this.users[userId].setId(userId);

          resolve();
        });
    });
  }
  getUsers() {
    return this.users;
  }

  /**
   * Set stages in SmashCrowd main object. This is mostly used by boards as a
   * reference, so the DB doesn't have to be pinged.
   *
   * @param {Array} board_data
   *   Optional board data, if you already have it. Saves a DB query.
   * @returns {Promise<Array>}
   */
  async setupBoards(board_data = null) {
    if (board_data == null) {
      await this.dbSelect('boards')
        .then((results) => {
          results.forEach(result => {
            this.boards[result.id] = result;
          });
        });
    }
    else {
      this.boards = board_data;
    }
    return this.boards;
  }
  addBoard(board) {

    return new Promise(resolve => {
      this.dbInsert('boards', {
        name: board.getName(),
        owner: board.getOwner(),
        draft_type: board.getDraftType().id,
        status: board.getStatus(),
        current_pick: board.getPick(),
        total_rounds: board.getTotalRounds(),
        current_draft_round: board.getDraftRound(),
        current_game_round: board.getGameRound(),
      })
        .then(boardId => {
          this.boards[boardId] = board;
          this.boards[boardId].setId(boardId);

          resolve(this.boards[boardId]);
        });
    });
  }
  async loadBoard(boardId) {
    return await this.dbSelectFirst('boards', '*', `id = "${boardId}"`);
  }

  getBoards() {
    return this.boards;
  }

  /**
   * Run all setup functions and return a single Promise, which fulfills when all done.
   *
   * @returns {Promise<any[]>}
   */
  async setupAll() {
    return Promise.all([
      this.setupSystem(),
      this.setupCharacters(),
      this.setupStages(),
      this.setupUsers(),
      this.setupBoards(),
    ])
  }

  /**
   * Loads all valid draft types from the database.
   *
   * @returns {Promise<Array>}
   */
  async loadDraftTypes() {
    const draft_types = {};

    await this.dbSelect('draft_types')
      .then(results => {
        results.forEach(draft_type => {
          draft_types[draft_type.id] = draft_type;
        });

      });

    return draft_types;
  }
  addDraftType(machine_name, label) {
    this.dbInsert('draft_types', {machine_name: machine_name, label: label});
  }

}

module.exports = Smashcrowd;
