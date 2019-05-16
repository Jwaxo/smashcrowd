/**
 * @file
 * db-install.js
 *
 * Used to analyze the current database schema and either install or update the
 * database.
 *
 * @usage
 * node db-install.js
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

const SmashCrowd = require('./src/factories/smashcrowd-smashcrowdfactory');

const crowd = new SmashCrowd(db, config);

// This needs to be synchronous to ensure that the server only starts running once
// everything else is complete.
require('./smashcrowd-updates').install(crowd)
  .then((log) => {
    console.log(log);
  });
