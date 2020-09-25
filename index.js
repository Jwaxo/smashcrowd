/**
 * @file
 * index.js
 *
 * The main SmashCrowd app.
 *
 * For assistance with running, see README.md
 */

const config = require('config');
const mysql = require('mysql');

const db = mysql.createPool(config.get("database.connection"));

const SmashCrowd = require('./src/factories/smashcrowd-smashcrowdfactory');

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

const crowd = new SmashCrowd(db, config);

// This needs to be synchronous to ensure that the server only starts running once
// everything else is complete.
require('./smashcrowd-updates').updates(crowd)
  .then((update_log) => {
    console.log(update_log);

    crowd.setupAll().then(() => {
      // We silo all of the main server logic to a separate file.
      require('./smashcrowd-server')(crowd, config);
    });
  });
