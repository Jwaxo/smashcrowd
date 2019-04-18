
const config = require('config');
const mysql = require('mysql');

var db = mysql.createConnection(config.get("database.connection"));

db.connect(error => {
  if (error) {
    throw error;
  }
  console.log("Database connected!");
});

// This needs to be synchronous to ensure that the server only starts running once
// everything else is complete.
require('./smashcrowd-updates')(config, db)
  .then(() => {

    // We silo all of the main server logic to a separate file.
    require('./smashcrowd-server')(config);

    // Build the sass and start to watch for style or JS changes.
    require('./smashcrowd-sass')();
  });
