/**
 * @file
 * Defines sass (and gulp) functions for rendering stylesheets.
 *
 */

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const autoprefixer = require('autoprefixer');

module.exports = () => {

  const sassPaths = [
    'node_modules/foundation-sites/scss',
    'node_modules/motion-ui/src'
  ];

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
};
