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

let config = {};
let SmashCrowd;

/**
 * Just runs the updates.
 *
 * @param {SmashCrowd} crowd
 */
module.exports.updates = (crowd) => {

  SmashCrowd = crowd;
  config = SmashCrowd.config;

  return new Promise((resolve, reject) => {
    SmashCrowd.setupSystem()
      .then(() => {
        runUpdates()
          .then((updates_message) => {
            resolve(updates_message);
          });
      });
  });
};

/**
 * Runs the install/DB update script, which compares the current DB structure.
 *
 * @param crowd
 * @returns {Promise<String>}
 */
module.exports.install = (crowd) => {
  SmashCrowd = crowd;
  config = SmashCrowd.config;

  return new Promise((resolve, reject) => {
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
              resolve('Database changes complete.');
              runUpdates()
                .then((updates_message) => {
                  resolve(updates_message);
                });
            });
        }
        else {
          console.log('DB structure already matches, checking for updates.');
          runUpdates()
            .then((updates_message) => {
              resolve(updates_message);
            });
        }
      });
  });
};

async function runUpdates() {

  console.log('Running updates');
  const promises = [];

  await SmashCrowd.setupSystem()
    .then(() => {
      let update_schema = SmashCrowd.getSystemValue('update_schema');
      if (update_schema == null) {
        console.log('SmashCrowd successfully installed.');
        // If this property doesn't exist, we have a fresh install.
        promises.push(postInstall());
      }
      else {
        // Otherwise, run all additional updates, should they exist.
        update_schema = parseInt(update_schema);
        const updates = getUpdates();
        let update = '';
        if (Object.keys(updates).length > update_schema) {
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
    });

  await Promise.all(promises);
  return 'Updates complete.';
}

/**
 * Install functions that run at the end of the installation process.
 *
 * If any  values need to be put into the DB on creation, this should be
 * accomplished in this function.
 */
function postInstall() {
  // Set the update values for various tables.
  // On initial install, update_schema should match the latest update in the updates
  // function.
  const update_numbers = Object.keys(getUpdates());
  const latest_update = update_numbers[update_numbers.length - 1];

  // Add default install and other config settings.
  const system_promise = SmashCrowd.dbInsert('system', [
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
        'scorecard',
      ].join(','),
      'type': 'array',
    }
  ])
    .then(() => {
      console.log('Systems table configured.');
    });

  const character_data = require('./src/lib/chars.json');
  const character_promise = SmashCrowd.dbInsert('characters', character_data.chars)
    .then(() => {
      console.log('All characters configured.');
    });

  const stage_data = require('./src/lib/levels.json');
  const stage_promise = SmashCrowd.dbInsert('stages', stage_data.levels)
    .then(() => {
      console.log('All stages configured.');
    });

  // For now we create a default board.
  // @todo: Adjust this once multiple boards are working.
  const default_board = {
    'name': config.get('server.default_board.name'),
    'draft_type': config.get('server.default_board.draft_type'),
    'owner': config.get('server.default_board.owner'),
  };
  const board_promise = SmashCrowd.dbInsert('boards', default_board)
    .then((board_id) => {
      console.log('id is ' + board_id);
      console.log('Default board created.');
    });

  // ...and create default players on that board.
  const default_players = config.get('server.default_board.players');
  const player_promises = [];
  if (Array.isArray(default_players) && default_players.length > 0) {
    for (let player of default_players) {
      player_promises.push(SmashCrowd.dbInsert('players', {
        name: player,
        board_id: 1,
        user_id: 0,
      })
        .then(playerId => {
          console.log(`Created default player ${player}.`);
        }));
    }
  }

  const promises = [
    system_promise,
    character_promise,
    stage_promise,
    board_promise,
  ];

  promises.concat(player_promises);

  return Promise.all(promises)
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
    "0001" : () => {
      // Adds the new scorecard draft type.
      SmashCrowd.setSystemValue('draft_types', [
          'snake',
          'free',
          'scorecard',
        ].join(','),
      );
      console.log('Added new draft type: Scorecard');
    },
  };
}
