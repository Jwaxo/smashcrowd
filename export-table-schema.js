/**
 * @file
 * export-table-schema.js
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
const dbdiff = require('dbdiff');
const fs = require('fs');

const db = mysql.createConnection(config.get("database.connection"));
const SmashCrowd = require('./src/factories/smashcrowd-smashcrowdfactory.js');

db.connect(error => {
  if (error) {
    throw error;
  }
  console.log("Database connected!");
});

const db_description = SmashCrowd.constructDbDiffString(config.get("database.connection"));

dbdiff.describeDatabase(db_description)
  .then((schema) => {
    fs.writeFileSync(config.get('database.export_path'), JSON.stringify(schema, null, '\t'));
    console.log('Database structure successfully exported.');
    process.exit(1);
  });
