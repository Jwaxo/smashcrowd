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

const db = mysql.createPool(config.get("database.connection"));

db.on('error', error => {
  console.log('Database caught major error: ' + error.toString());
  console.log(error.code);
  throw error;
});

if (config.get("database.debug")) {
  db.on('connection', connection => {
    console.log(`Database connected with id ${connection.threadId}`);
  });
  db.on('release', connection => {
    console.log(`Database released connection ${connection.threadId}`);
  });
}

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

  const SmashCrowd = require('./src/factories/smashcrowd-smashcrowdfactory');

  const crowd = new SmashCrowd(db, config);

// This needs to be synchronous to ensure that the server only starts running once
// everything else is complete.
  require('./smashcrowd-updates').install(crowd)
    .then((log) => {
      console.log(log);
      process.exit(1);
    });
});
