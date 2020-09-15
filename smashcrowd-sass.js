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
  images();
  gulp.task('sass', () => {
    return sass();
  });
  gulp.task('images', () => {
    return images();
  });

  gulp.watch('scss/*.scss', gulp.series('sass'));
  gulp.watch('scss/images/*', gulp.series('images'));

  /**
   * Build out the Sass located in scss/app.scss. Outputs to public/css.
   */
  function sass() {
    console.log('Rendering SCSS...');
    const returned = gulp.src('scss/app.scss')
      .pipe($.sass({
        includePaths: sassPaths,
        outputStyle: 'compressed' // if css compressed **file size**
      })
        .on('error', $.sass.logError))
      .pipe($.postcss([
        autoprefixer({ browsers: ['last 2 versions', 'ie >= 9'] })
      ]))
      .pipe(gulp.dest('client/src/build/css'));
    console.log('Render complete!');
    return returned;
  }

  /**
   * Copy images located in scss/images to client/src/build/images.
   */
  function images() {
    console.log('Copying images...');
    const returned = gulp.src('scss/images/**/*.+(png|jpg|jpeg|gif|svg)')
      .pipe(gulp.dest('client/src/build/css/images'));
    console.log('Images copied!');
    return returned;
  }
};
