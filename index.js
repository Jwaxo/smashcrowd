
const socketio = require('socket.io');
const http = require('http');
const express = require('express');
const Twig = require('twig');

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');
const colors = require('colors/safe');

const app = express();
const server = http.Server(app);

const clientFactory = require('./src/smashdown-clientfactory.js');
const playerFactory = require('./src/smashdown-playerfactory.js');
const characterFactory = require('./src/smashdown-characterfactory.js');

const io = socketio(server);

const sassPaths = [
  'node_modules/foundation-sites/scss',
  'node_modules/motion-ui/src'
];

const port = 8080;
const chatHistory = [];
const clients = [];
const players = [];
const console_colors = [ 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'gray', 'bgRed', 'bgGreen', 'bgYellow', 'bgBlue', 'bgMagenta', 'bgCyan', 'bgWhite'];
const charData = require('./lib/chars.json');

// Process characters.
const characters = [];

for (let i = 0; i < charData.chars.length; i++) {
  characters[i] = characterFactory.createCharacter(i, charData.chars[i]);
}

// Do basic server setup stuff.
app.use(express.static(__dirname + '/public'));

app.set("twig options", {
  allow_async: true,
  strict_variables: false
});

app.get('/', function(req, res) {
  res.render('index.twig', {
    characters: characters,
    players: players,
  });
});

// Build the sass.
sass();

// Listen at the port.
server.listen(port, () => {
  console.log(`Listening on ${port}`);
});

// Handling of individual sockets as they remain connected.
io.on('connection', socket => {
  serverLog(`New connection established with hash ${socket.id}`);

  const randomColor = Math.floor(Math.random() * (console_colors.length));

  const client = clientFactory.createClient(socket, console_colors[randomColor]);
  const clientId = clients.push(client);
  const clientColor = colors[client.getColor()];
  const clientLabel = clientColor(`Client ${clientId}`);

  serverLog(`${clientLabel} assigned to socket ${socket.id}`);

  socket.on('add-player', name => {
    serverLog(`${clientLabel} adding player ${name}`);
    const player = playerFactory.createPlayer(name);

    players.push(player);

    // @todo This is currently a placeholder. We need to set dynamic player
    // @todo ownership.
    players[0].setClient(clientId);
    players[0].isActive = true;
    client.setPlayer(0);

    regeneratePlayers(clientId);
  });

  socket.on('add-character', charId => {
    const playerId = client.getPlayer();
    if (playerId === null) {
      serverLog(`${clientLabel} tried to add character ${charId} but does not have a player selected!`);
    }
    else {
      serverLog(`${clientLabel} adding character ${charId} to player ${playerId}`);
      characters[charId].setPlayer(playerId);
      players[playerId].addCharacter(characters[charId]);

      regeneratePlayers(clientId);
      regenerateCharacters();
    }
  });

  // Be sure to remove the client from the list of clients when they disconnect.
  socket.on('disconnect', () => {
    serverLog(`${clientLabel} disconnected.`);
    if (player = client.getPlayer()) {
      players[player].setClient();
    }
    clients.splice(clientId - 1, 1);
  });
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

function regeneratePlayers(clientId) {
  console.log(players);
  Twig.renderFile('./views/players-container.twig', {players, clientId}, (error, html) => {
    io.sockets.emit('rebuild-players', html);
  });
}

function regenerateCharacters() {
  Twig.renderFile('./views/characters-container.twig', {characters}, (error, html) => {
    io.sockets.emit('rebuild-characters', html);
  });
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
