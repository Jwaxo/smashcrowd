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

db.on('error', err => {
  console.log('caught this error: ' + err.toString());
});

db.connect(error => {
  if (error) {
    throw error;
  }
  console.log("Database connected!");
});

const SmashCrowd = require('./src/factories/smashcrowd-smashcrowdfactory');

const crowd = new SmashCrowd(db, config);

// This needs to be synchronous to ensure that the server only starts running once
// everything else is complete.
require('./smashcrowd-updates')(crowd)
  .then(() => {
    crowd.setupAll().then(() => {
      // We silo all of the main server logic to a separate file.
      require('./smashcrowd-server')(crowd, config);

      // Build the sass and start to watch for style or JS changes.
      require('./smashcrowd-sass')();
    });
  });
