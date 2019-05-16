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
const dbdiff = require('dbdiff');

let db = {};
let config = {};

/**
 * Just runs the updates.
 *
 * @param {SmashCrowd} crowd
 */
module.exports.updates = (crowd) => {

  const SmashCrowd = crowd;
  db = SmashCrowd.db;
  config = SmashCrowd.config;

  runUpdates(SmashCrowd);
};

/**
 * Runs the install/DB update script, which compares the current DB structure.
 *
 * @param crowd
 * @returns {Promise<String>}
 */
module.exports.install = (SmashCrowd) => {

  return new Promise((resolve, reject) => {
    resolve();
    const db_description = SmashCrowd.getDbDiffString(config.get("database.connection"));

    dbdiff.describeDatabase(db_description)
      .then((schema) => {
        const tableSchema = require('./' + config.get('database.export_path'));
        const diff = new dbdiff.DbDiff();
        diff.compareSchemas(schema, tableSchema);
        const commands = diff.commands('drop').split(';');
        for (let i = 0; i < commands.length; i++) {
          commands[i] = commands[i].replace(' DEFAULT_GENERATED', '');
        }
        if (commands.length > 0) {
          SmashCrowd.dbQueries(commands)
            .then(() => {

              SmashCrowd.setupSystem()
                .then(() => {
                  runUpdates(SmashCrowd);

                  resolve('Database changes complete.');
                })
            });
        }
        else {
          console.log('DB structure already matches, checking for updates.');
          runUpdates(SmashCrowd);
          resolve('Updates complete.');
        }
      });
  });
};

function runUpdates(SmashCrowd) {
  let update_schema;
  try {
    update_schema = SmashCrowd.getSystemValue('update_schema');
  }
  catch (error) {
    console.log('Error getting update version! You may not have installed SmashCrowd yet. Run `node db-install`.');
    throw error;
  }
  if (update_schema == null) {
    console.log('SmashCrowd successfully installed.');
    // If this property doesn't exist, we have a fresh install.
    postInstall(SmashCrowd);
  }
  else {
    // Otherwise, run all additional updates, should they exist.
    update_schema = parseInt(update_schema);
    const updates = getUpdates();
    let update = '';
    if (updates.length > 0) {
      for (update in updates) {
        if (parseInt(update) > update_schema) {
          console.log(`Running update ${update}`);
          updates[update]();
        }
      }
      console.log(`Updated to version ${update}.`);
      SmashCrowd.setSystemValue('update_schema', update);
    }
  }
}

/**
 * Install functions that run at the end of the installation process.
 *
 * If any  values need to be put into the DB on creation, this should be
 * accomplished in this function.
 */
function postInstall(SmashCrowd) {
  // Set the update values for various tables.
  // On initial install, update_schema should match the latest update in the updates
  // function.
  const update_numbers = Object.keys(getUpdates());
  const latest_update = update_numbers[update_numbers.length - 1];

  // Add default install and other config settings.
  SmashCrowd.dbInsert('system', [
    {
      'key': 'update_schema',
      'value': latest_update,
      'type': 'string',
    },
    {
      'key': 'draft_types',
      'value': [
        'snake',
        'free',
      ].join(','),
      'type': 'array',
    }
  ])
    .then(() => {
      console.log('Systems table configured.');
    });

  const character_data = require('./src/lib/chars.json');
  SmashCrowd.dbInsert('characters', character_data.chars)
    .then(() => {
      console.log('All characters configured.');
    });

  const stage_data = require('./src/lib/levels.json');
  SmashCrowd.dbInsert('stages', stage_data.levels)
    .then(() => {
      console.log('All stages configured.');
    });

  // For now we create a default board.
  // @todo: remove this once multiple boards are working.
  SmashCrowd.dbInsert('boards', config.get('server.default_board'));
}

/**
 * Updates to run for systems that already have SmashCrowd installed.
 *
 * If any data in the database needs to be manually massaged in order to make
 * an update to the code work, add it here via a new function, keyed numerically.
 *
 * @returns {Object}
 */
function getUpdates() {
  // An example of what this might look like once we have updates.
  // return {
  //   "0001" : () => {
  //     console.log('This is the first update.');
  //   },
  // }
  return {
    "0000" : () => {},
  };
}
