/**
 * @file
 * dbtest.js
 *
 * For assistance with running, see README.md
 */

const config = require('config');
const mysql = require('mysql');
const express = require('express');
const http = require('http');
const app = express();
const server = http.Server(app);

const db = mysql.createPool(config.get("database.connection"));
const port = config.get('server.port');

db.on('error', function(err) {
  console.log('Error ' + err.code);
  console.log('caught this error: ' + err.toString());
});

// Listen at the port.
server.listen(port, () => {
  console.log(`Listening on ${port}`);

  db.query("SELECT * FROM ?? WHERE 1", ['system'], (error, results) => {
    if (error) {
      console.log("Error performing test query");
      throw error;
    }
    console.log("Successful query:");
    for (let result of results) {
      console.log(result);
    }
  })
});
