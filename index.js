
const config = require('config');

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');

const sassPaths = [
  'node_modules/foundation-sites/scss',
  'node_modules/motion-ui/src'
];

// We silo all of the main server logic to a separate file.
require('./smashcrowd-server')(config);

// Build the sass and start to watch for style or JS changes.
sass();
gulp.watch(['scss/*.scss'], () => {
  sass();
});

/**
 * Build out the Sass located in scss/app.scss. Outputs to public/css.
 */
function sass() {
  console.log('Rendering SCSS...');
  return gulp.src('scss/app.scss')
    .pipe($.sass({
      includePaths: sassPaths,
      outputStyle: 'compressed' // if css compressed **file size**
    })
      .on('error', $.sass.logError))
    .pipe($.postcss([
      autoprefixer({ browsers: ['last 2 versions', 'ie >= 9'] })
    ]))
    .pipe(gulp.dest('public/css'));
}
