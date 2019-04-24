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

const db = mysql.createConnection(config.get("database.connection"));

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

    // We silo all of the main server logic to a separate file.
    require('./smashcrowd-server')(config);

    // Build the sass and start to watch for style or JS changes.
    require('./smashcrowd-sass')();
  });
