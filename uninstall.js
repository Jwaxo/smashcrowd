/**
 * @file
 * uninstall.js
 *
 * Exports the current database configuration to the file defined in config.database.export_path
 *
 * This is used when smashcrowd is first ran to determine if any changes to the
 * db structure needs to be ran. If you need to make changes to the DB structure
 * and want those changes to be shared in the rest of the SmashCrowd community,
 * be sure to export the table schema.
 *
 * @usage
 * node export-table-schema.js
 */

const config = require('config');
const mysql = require('mysql');

const db = mysql.createConnection(config.get("database.connection"));

const tables = require('./' + config.get('database.export_path')).tables;
const drop_table_promises = ['DROP TABLE'];

// Get all tables in the schema and Promise to drop them.
for (let table in tables) {
  drop_table_promises.push(new Promise((resolve) => {
    db.query("DROP TABLE ??", [tables[table].name], (error, results) => {
      // We want to continue if there's an error; the only feasible one is that
      // a table doesn't exist, which ain't a problem.
      if (error) {
        console.log(`Error dropping table ${tables[table].name}:`);
        console.log(error);
      }
      else {
        console.log(`Dropped table ${tables[table].name}.`);
      }
      resolve();
    })
  }));
}

Promise.all(drop_table_promises).then(() => {
  console.log("All tables dropped!");
  process.exit(1);
});
