
const config = require('config');
const mysql = require('mysql');

var db = mysql.createConnection(config.get("database.connection"));

db.connect(error => {
  if (error) {
    throw error;
  }
  console.log("Database connected!");
});

require('./smashcrowd-updates')(config, db);

// We silo all of the main server logic to a separate file.
require('./smashcrowd-server')(config);

// Build the sass and start to watch for style or JS changes.
require('./smashcrowd-sass')();
