
const socketio = require('socket.io');
const http = require('http');
const express = require('express');

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');

const app = express();
const server = http.Server(app);
const io = socketio(server);

const sassPaths = [
  'node_modules/foundation-sites/scss',
  'node_modules/motion-ui/src'
];

const port = 8080;
const chatHistory = [];
const clients = [];
const colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange', ];

// Do basic server setup stuff.

app.use(express.static(__dirname + '/public'));

// Build the sass.
sass();

// Listen at the port.
server.listen(port, () => {
  console.log(`Listening on ${port}`);
});

// What to do when there's a new connection.
io.on('connection', socket => {
  serverLog(`New connection established with ID ${socket.id}`);
  const clientInfo = new Client(socket);
  const clientId = clients.push(clientInfo);
  serverLog(`Client ${clientId} assigned color ${clientInfo.color}`);
});

/**
 * Creates a simple message for displaying to the server, with timestamp.
 *
 * @param message
 */
function serverLog(message) {
  const date = new Date();
  const timestamp = date.toLocaleString("en-US");
  console.log(`${timestamp}: ${message}`);
}

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build out the Sass located in scss/app.scss. Outputs to public/css.
 */
function sass() {
  return gulp.src('scss/app.scss')
    .pipe($.sass({
      includePaths: sassPaths,
      outputStyle: 'compressed' // if css compressed **file size**
    })
      .on('error', $.sass.logError))
    .pipe($.postcss([
      autoprefixer({ browsers: ['last 2 versions', 'ie >= 9'] })
    ]))
    .pipe(gulp.dest('public/css'))
}

/**
 * Information and methods used for an individual user connection.
 */
class Client {
  constructor(socket) {
    this.socket = socket;
    this.color = colors[0];// Setting to Red by default for now.

    return this;
  }
}
