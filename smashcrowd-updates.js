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

let db = {};
let config = {};
let SmashCrowd = {};

module.exports = (crowd) => {

  SmashCrowd = crowd;
  db = SmashCrowd.db;
  config = SmashCrowd.config;

  const tableSchema = require('./src/lib/table-schema.json');
  return new Promise((resolve, reject) => {
    // The "system" table is required in the table-schema definition, so check for
    // that table's existence.
    db.query("SHOW TABLES LIKE 'system'", (error, results) => {
      if (results.length === 0) {
        // We don't have the basic system table, so install everything!
        install(tableSchema)
          .then(() => {
            console.log("Finished creating tables.");

            postTablesInstall();
            SmashCrowd.setupSystemAll();

            resolve();
          });
      }
      else {
        SmashCrowd.setupSystemAll();
        console.log(SmashCrowd.system.update_schema);

        for (let update in updates()) {
          console.log (`Running update ${update}`);
        }
        resolve();
      }
    });
  });
};

/**
 * Using a defined set of tables, create a fresh database and run any extra install functions.
 *
 * NOTE: If you create any updates to the db structure or data in an update, you
 * should ensure that the structure is recorded in table-schema.
 *
 * This function runs asynchronously because MySQL queries are async; we need
 * to be able to wait for all of them to complete to run the PostInstall process.
 *
 * @param {Object} tableSchema
 *   The table schema, normally defined in src/lib/table-schema.json
 */
async function install(tableSchema) {
  // Loop over every defined table.
  console.log("Beginning install process!");
  const tablePromises = [];

  // Using our tableschema, create all defined tables and columns.
  for (let tablename in tableSchema) {

    let query = `CREATE TABLE \`${tablename}\``;
    const table = tableSchema[tablename];

    if (Object.keys(table).length > 0) {
      const columns = [];
      const primaries = [];
      for (let columnname in table) {
        // Go through each column and formulate a SQL query to create the rest.
        const column = table[columnname];
        let columnstring = `\`${columnname}\` ${column.type}`;

        if (column.not_null) {
          columnstring += ` NOT NULL`;
        }
        if (column.hasOwnProperty('default')) {
          columnstring += ` DEFAULT ${column.default}`;
        }
        if (column.increment) {
          columnstring += ` AUTO_INCREMENT`;
        }
        if (column.primary) {
          primaries.push(`\`${columnname}\``);
        }
        columns.push(columnstring);
      }

      if (primaries.length > 0) {
        columns.push(` PRIMARY KEY (${primaries.join(',')})`);
      }
      query += `( ${columns.join(', ')} )`;
    }
    const table_create = db.query(query);

    // Now form an array of promises for each CREATE TABLE query, so we can know
    // when it's all over.
    tablePromises.push(new Promise((resolve, reject) => {
      // We do this with custom handlers in order to handle each table creation
      // individually, instead of waiting for all of them.
      table_create
        .on('error', error => {
          reject(error);
        })
        .on('end', row => {
          console.log(`Created table "${tablename}".`);
          resolve();
        });
    }));

  }
  await Promise.all(tablePromises);
}

/**
 * Install functions that run at the end of the installation process.
 *
 * This is where things such as default rows in tables, etc, should be set up.
 * This should also match the results that occur from running all of the updates.
 */
function postTablesInstall() {
  // Set the update values for various tables.
  SmashCrowd.dbInsert('system', {
    'key': 'update_schema',
    'value': '0000',
  })
    .then(() => {
      console.log('Systems table configured!');
      SmashCrowd.setupSystemAll()
        .then(() => {
          resolve();
        })
    });
}

/**
 * Updates to run for systems that already have SmashCrowd installed.
 *
 * Updates should generally be direct database changes, and should go in order
 * from 0001 to the most recent update.
 * Any updates made here should be reflected in postTablesInstall and in the
 * table-schema.json, so that fresh installs are identical to updated installs.
 *
 * @returns {Object}
 */
function updates() {
  // An example of what this might look like once we have updates.
  // return {
  //   "0001" : () => {
  //     console.log('This is the first update.');
  //   },
  // }
  return {};
}
