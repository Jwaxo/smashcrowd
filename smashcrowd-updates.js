/**
 * @file
 * Defines update and install structure of SmashCrowd.
 *
 * The general thrust of our update system is based off of Drupal's, because
 * it is a strong structure for maintaining long-running projects.
 *
 * On requiring and running this file, the database is checked to see if the
 * basic "smashcrowd_system" table exists.
 *
 * If the table does not exist, we run the entire install function, which should
 * result in a database ready to run the latest version of Smashcrowd.
 * If the table does exist, we see which of the updates was the last one ran, then
 * run any updates numbered past then.
 *
 * This means that, if you are adding an update, you should also update the
 * install function. This is because updating an existing table is probably
 * a very different beast from creating an entirely new table, and we need to
 * account for both of them.
 */

module.exports = (config, db) => {

  const tableSchema = require('./src/lib/table-schema.json');

  // The "system" table is required in the table-schema definition, so check for
  // that table's existence.
  db.query("SHOW TABLES LIKE 'system'", (error, results) => {
    if (results.length === 0) {
      install();
    }
    else {
      for (let update in updates()) {
        console.log (`Running update ${update}`);
      }
    }
  });

};

function install() {
  console.log('I am installing.');
}

function updates() {
  return {
    "0001" : db => {
      console.log('This is the first update.');
    },
  };
}
