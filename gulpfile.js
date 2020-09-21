const { watch, parallel, series, dest, src } = require('gulp');
const $ = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');
const { spawn } = require('child_process');
let node;

const sassPaths = [
  'node_modules/foundation-sites/scss',
  'node_modules/motion-ui/src'
];

function taskSass(cb) {
  console.log('Rendering SCSS...');
  const returned = src('scss/app.scss')
    .pipe($.sass({
      includePaths: sassPaths,
      outputStyle: 'compressed' // if css compressed **file size**
    })
      .on('error', $.sass.logError))
    .pipe($.postcss([
      autoprefixer({ browsers: ['last 2 versions', 'ie >= 9'] })
    ]))
    .pipe(dest('client/src/build/css'));
  console.log('Render complete!');
  return returned;
}

function taskImages(cb) {
  console.log('Copying images...');
  const returned = src('scss/images/**/*.+(png|jpg|jpeg|gif|svg)')
    .pipe(dest('client/src/build/css/images'));
  console.log('Images copied!');
  return returned;
}

function taskServer(cb) {
  // If a server is already running, kill it.
  if (node) node.kill();
  node = spawn('node', ['index.js'], {stdio: 'inherit'});
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
  cb();
}

function taskWatch(cb) {
  watch('scss/*.scss', taskSass);
  watch('scss/images/*', taskImages);
  watch(['index.js', 'smashcrowd-server.js', 'src/**/*.js'], taskServer);
  cb();
}

exports.default = series(taskSass, taskImages);
exports.dev = parallel(taskWatch, series(taskSass, taskImages, taskServer));
