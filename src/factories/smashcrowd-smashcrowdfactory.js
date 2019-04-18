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

  async dbSelectFirst(table, fields = '*', where = 1) {
    if (Array.isArray(fields)) {
      fields = `\`${fields.join('\`,\`')}\``;
    }
    return new Promise(resolve => {
      this.db.query(`SELECT ${fields} FROM ?? WHERE ? LIMIT 1`, [table, where], (error, results, fields) => {
        if (error) {
          throw error;
        }
        let result = {};

        if (results.length > 0) {
          result = results[0];
        }

        resolve(result);

      });
    });
  }

  async dbSelect(table, fields = '*', where = 1) {
    if (Array.isArray(fields)) {
      fields = `\`${fields.join('\`,\`')}\``;
    }
    return new Promise(resolve => {
      this.db.query(`SELECT ${fields} FROM ?? WHERE ?`, [table, where], (error, results) => {

        if (error) {
          throw error;
        }

        resolve(results);
      });
    });
  }

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
