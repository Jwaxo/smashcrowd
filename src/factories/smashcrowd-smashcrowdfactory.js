/**
 * Logic, query, and other app-wide functions and services. This tracks all db
 * values and caches them, while also holding the functions to update the db.
 */

const Player = require('./smashcrowd-playerfactory.js');
const Board = require('./smashcrowd-boardfactory');

class SmashCrowd {

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
    let row = {};
    await this.dbSelect(table, fields, where, sort, 1)
      .then(results => {
        row = results[0];
      });
    return row;
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
      sql.push(`ORDER BY ${sort}`);
    }
    if (limit !== 0) {
      sql.push(`LIMIT ${limit}`);
    }
    return new Promise(resolve => {
      console.log('running select');
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
      console.log('running insert');
      this.db.query(`INSERT INTO ?? (${fields.join(',')}) VALUES ("${values.join('"),("')}")`, [table], (error, results) => {
        if (error) {
          throw error;
        }

        resolve(results.insertId);
      });
    });
  }

  /**
   * Deletes one or more rows from a given table.
   *
   * @param {string} table
   * @param {string} where
   *   Logic to determine which rows to drop. Leave blank to truncate table.
   * @returns {Promise<int>}
   */
  async dbDelete(table, where = 1) {

    return new Promise(resolve => {
      console.log('running delete');
      this.db.query(`DELETE FROM ?? WHERE ${where}`, [table], (error, results) => {
        if (error) {
          throw error;
        }

        resolve(results.affectedRows);
      });
    });
  }

  /**
   * Updates one or more rows on a given table.
   *
   * @param {string} table
   * @param {Object} fieldvalues
   *   An object of matching field names and expected values.
   *   If you want to update multiple rows, the value should be an array of objects
   *   that follow the format:
   *     when: 'where conditional'
   *     then: 'value'
   *
   * @param {string} where
   *   A MySQL WHERE statement to tell you when to update to these values.
   * @returns {Promise<*>}
   */
  async dbUpdate(table, fieldvalues, where) {
    // Build our arrays of field and value strings out of each row.
    const set = [];
    for (let field in fieldvalues) {
      if (Array.isArray(fieldvalues[field])) {
        const casewhens = [];

        for (let i = 0; i < fieldvalues[field].length; i++) {
          const casewhen = fieldvalues[field][i];
          casewhens.push(`when ${casewhen.when} then "${casewhen.then}"`);
        }

        set.push(`\`${field}\` = (case ${casewhens.join(' ')} end)`);
      }
      else {
        set.push(`\`${field}\` = "${fieldvalues[field]}"`);
      }
    }

    return new Promise(resolve => {
      console.log('running update');
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
          console.log('running multiple queries');
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
          let value = result.value;
          switch (result.type) {
            case 'string':
              break;

            case 'array':
              value = result.value.split(',');
              break;

          }

          this.system[result.key] = value;
        });
      });
  }
  setSystemValue(key, value, type = null) {
    const fieldvalues = {
      'value': value,
    };
    if (type !== null) {
      fieldvalues.type = type;
    }
    this.system[key] = value;
    this.dbUpdate('system', fieldvalues, `\`key\` = "${key}"`);
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
   * Set users in SmashCrowd iterator. This is mostly used by boards as a
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

  /**
   * Adds the user to the database and returns a unique ID.
   *
   * @param {User} user
   * @param {string} password
   * @returns {Promise<any>}
   */
  createUser(user, password) {
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

  /**
   * Creates a player row with board, then returns a Promise for the player ID.
   *
   * @param {string} name
   * @param {Board} board
   * @returns {Promise<number>}
   */
  createPlayer(name, board) {
    return new Promise(resolve => {
      this.dbInsert('players', {
        name: name,
        board_id: board.getId(),
      })
        .then(playerId => {
          const player = new Player(name);
          player.setId(playerId);
          board.addPlayer(player);

          resolve(player);
        });
    });
  }
  async loadPlayersByBoard(board_id) {
    const players = [];
    const board = this.getBoardById(board_id);

    // To streamline the loading a bit, we set up many different select promises
    // that grab the characters and stages for each player and load them.
    // This all needs to be returned before we're done in this function.
    const promises = [];
    await this.dbSelect('players', '*', `board_id = "${board_id}"`)
      .then(player_results => {
        player_results.forEach(player_result => {
          const player = new Player(player_result.name, player_result.user_id);
          player.setId(player_result.id);

          // We can ignore board_id, because that will get added automatically
          // when the board takes ownership of each player.

          if (player_result.pick_order !== null) {
            player.setPickOrder(player_result.pick_order);
          }

          if (player_result.display_order !== null) {
            player.setDisplayOrder(player_result.display_order);
          }
          players.push(player);

          const character_promise = this.dbSelect('player_characters', '*', `player_id = "${player_result.id}"`, 'roster_number ASC')
            .then(character_results => {
              character_results.forEach(character_result => {
                player.addCharacter(board.getCharacter(character_result.character_id));
                if (character_result.win) {
                  board.setPlayerWin(player_result.id, character_result.roster_number, true);
                }
              });
            });

          const stage_promise = this.dbSelect('player_stages', '*', `player_id = "${player_result.id}"`, 'stage_id ASC')
            .then(stage_results => {
              stage_results.forEach(stage_result => {
                player.addStage(board.getStage(stage_result.stage_id));
              });
            });

          promises.push(character_promise, stage_promise);

        });
      });
    await Promise.all(promises);
    return players;
  }

  /**
   * Updates the main `players` table with new data.
   *
   * @param {number} player_id
   * @param {Object} fieldValues
   */
  updatePlayer(player_id, field_values) {
    this.dbUpdate('players', field_values, `id = "${player_id}"`);
  }

  /**
   * Updates the `player_characters` table with new data.
   *
   * @param {number} player_id
   * @param {number} roster_number
   * @param {Object}field_values
   */
  updatePlayerCharacter(player_id, roster_number, field_values = {}) {
    this.dbUpdate('player_characters', field_values, `player_id = "${player_id}" AND roster_number = "${roster_number}"`);
  }

  /**
   * Drops a player from the player table.
   *
   * @param {number} player_id
   */
  dropPlayer(player_id) {
    this.dbDelete('players', `id = "${player_id}"`);
  }

  /**
   * Drops all players from a given board.
   *
   * @param {number} board_id
   */
  dropPlayersByBoard(board_id) {
    this.dbDelete('players', `board_id = "${board_id}"`);
  }

  /**
   * Adds a character assignment to the player-character table.
   *
   * @param {number} player_id
   * @param {number} character_id
   * @param {number} roster_position
   */
  addCharacterToPlayer(player_id, character_id, roster_position) {
    const fieldValues = {
      "player_id": player_id,
      "character_id": character_id,
      "roster_number": roster_position,
    };
    this.dbInsert('player_characters', fieldValues);
  }

  /**
   * Drops a character assignment from the player-character table.
   *
   * @param {number} player_id
   * @param {number} roster_number
   */
  dropCharacterFromPlayer(player_id, roster_number) {
    const fieldValues = {
      "player_id": player_id,
      "roster_number": roster_number,
    };
    this.dbDelete('player_characters', `player_id = "${player_id}" AND roster_number = "${roster_number}"`);
  }

  /**
   * Drops all character assignments from a board.
   *
   * @param {array} players
   */
  dropCharactersFromPlayers(players) {
    const player_ids = [];
    for (let player of players) {
      player_ids.push(player.getId());
    }

    this.dbDelete('player_characters', `player_id IN ("${player_ids.join('","')}")`);
  }

  /**
   * Go through a player's characters and send the update command to the DB with
   * a new order.
   *
   * @param {Player} player
   */
  updatePlayerRosterIndex(player) {
    // Get a list of character IDs and their new indices in the character array.
    const character_indices = [];
    for (let i = 0; i < player.getCharacterCount(); i++) {
      character_indices.push({
        when: `character_id = "${player.getCharacterByIndex(i).getId()}"`,
        then: i,
      });
    }

    this.dbUpdate('player_characters', {'roster_number': character_indices}, `player_id = "${player.getId()}"`);
  }

  /**
   * Adds a stage assignment to the player-stage table.
   *
   * @param {number} player_id
   * @param {number} stage_id
   */
  addStageToPlayer(player_id, stage_id) {
    const fieldValues = {
      "player_id": player_id,
      "stage_id": stage_id,
    };
    this.dbInsert('player_stages', fieldValues);
  }

  /**
   * Drops a stage assignment from the player-stage table.
   *
   * @param {number} player_id
   * @param {number} stage_id
   */
  dropStageFromPlayer(player_id, stage_id) {
    const fieldValues = {
      "player_id": player_id,
      "stage_id": stage_id,
    };
    this.dbDelete('player_stages', `player_id = "${player_id}" AND stage_id = "${stage_id}"`);
  }

  async loadUser(userId) {
    return await this.dbSelectFirst('users', '*', `id = "${userId}"`);
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
            this.boards[result.id] = new Board(this, result.id);
          });
        });
    }
    else {
      this.boards = board_data;
    }
    return this.boards;
  }

  createBoard(board) {
    return new Promise(resolve => {
      this.dbInsert('boards', {
        name: board.getName(),
        owner: board.getOwner(),
        draft_type: board.getDraftType(),
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
  updateBoard(board_id, field_values) {
    this.dbUpdate('boards', field_values, `id = "${board_id}"`);
  }
  async loadBoard(boardId) {
    return await this.dbSelectFirst('boards', '*', `id = "${boardId}"`);
  }

  getBoards() {
    return this.boards;
  }

  getBoardById(board_id) {
    return this.boards[board_id];
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
   * Loads all valid draft types from the database. This should be defined via
   * config and not a table.
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

  /**
   *
   * @param {string} machine_name
   * @param {string} label
   */
  createDraftType(machine_name, label) {
    this.dbInsert('draft_types', {machine_name: machine_name, label: label});
  }

}

module.exports = SmashCrowd;
