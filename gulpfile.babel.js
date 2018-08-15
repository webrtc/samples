import gulp from 'gulp';
import eslint from 'gulp-eslint';
import htmlhint from 'gulp-htmlhint';
import zip from 'gulp-zip';
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

gulp.task('htmlhint', function() {
  return gulp.src(['src/content/**/*.html', '!**/third_party/*.html'])
    .pipe(htmlhint())
    .pipe(htmlhint.reporter())
    .pipe(htmlhint.failOnError());
});

gulp.task('nightwatch', function() {
  return gulp.src('gulpfile.js')
    .pipe(nightwatch({
      configFile: 'nightwatch.json',
      cliArgs: ['--env chrome']
    }));
});

gulp.task('default', ['eslint', 'htmlhint', 'nightwatch']);
