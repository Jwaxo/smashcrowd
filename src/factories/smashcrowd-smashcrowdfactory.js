/**
 * Logic, query, and other app-wide functions and services. This tracks all db
 * values and caches them, while also holding the functions to update the db.
 */

class Smashcrowd {

  /**
   *
   * @param {Connection} db
   * @param {JSON} config
   */
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.system = {};
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
    return await this.dbSelect(table, fields, where, sort, 1)
      .then((result) => {
        resolve(result);
      });
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
   * @returns {Promise<*>}
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

        resolve();
      })
    })
  }

  /**
   * Selects all of the rows in the `system` table and saves them to the property.
   * @returns {Promise<*>}
   */
  async setupSystemAll() {
    return await this.dbSelect('system')
      .then((results) => {
        results.forEach(result => {
          this.system[result.key] = result.value;
        });
      });
  }
  setSystemValue(key, value) {

  }
  getSystemValue(key) {
    return this.system[key];
  }

}

module.exports = Smashcrowd;
