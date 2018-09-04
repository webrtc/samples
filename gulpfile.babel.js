'use strict';

import gulp from 'gulp';
import eslint from 'gulp-eslint';
import zip from 'gulp-zip';
import gulpStylelint from 'gulp-stylelint';
import nightwatch from 'gulp-nightwatch';

gulp.task('zip', function() {
  return gulp.src('src/content/extensions/desktopcapture/extension/**')
    .pipe(zip('desktopCaptureExtension.zip'))
    .pipe(gulp.dest('release'));
});

gulp.task('eslint', function() {
  return gulp.src(['src/content/**/*.js', 'test/*.js', '!**/third_party/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});


gulp.task('stylelint', function() {
  return gulp.src('src/**/*.css')
    .pipe(gulpStylelint({
      reporters: [
        {formatter: 'string', console: true}
      ]
    }));
});

gulp.task('nightwatch', function() {
  const browser = process.env.BROWSER || 'chrome';
  return gulp.src('gulpfile.babel.js')
    .pipe(nightwatch({
      configFile: 'nightwatch.conf.js',
      cliArgs: [`--env ${browser}`]
    }));
});


gulp.task('default', gulp.series('eslint', 'stylelint', 'nightwatch'));