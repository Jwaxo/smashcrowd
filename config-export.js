
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
