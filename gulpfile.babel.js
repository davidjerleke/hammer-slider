'use strict';

/*
|--------------------------------\
|  dependencies --> NPM MODULES
|--------------------------------/
*/
import gulp from 'gulp';
import babel from 'gulp-babel';
import eslint from 'gulp-eslint';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import rename from 'gulp-rename';
import sourcemaps from 'gulp-sourcemaps';
import gulpSequence from 'gulp-sequence';
import browserSync from 'browser-sync';
browserSync.create();


/*
|----------------------\
|  settings --> PATHS
|----------------------/
*/
const Paths = (() => {
  const srcPath = './src',
    distPath = './dist';

  return {
    OUT: distPath,
    SASS_SRC: `${srcPath}/scss/style.scss`,
    SASS_OUT: `${distPath}/css/`,
    JS_SRC: `${srcPath}/js/*.js`,
    JS_OUT: `${distPath}/js/`
  };
})();


/*
|---------------------\
|  task --> BUILD JS
|---------------------/
*/
gulp.task('build:js', () => {
  return gulp.src(Paths.JS_SRC)
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(concat('hammerslider.js'))
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(Paths.JS_OUT))
    .pipe(browserSync.stream());
});


/*
|--------------------\
|  task --> LINT JS
|--------------------/
*/
gulp.task('lint:js', () => {
  return gulp.src(Paths.JS_SRC)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});


/*
|------------------------\
|  task --> BROWSERSYNC
|------------------------/
*/
gulp.task('browserSync', () => {
  browserSync.init({
    server: {
      baseDir: "./"
    }
  });
});


/*
|------------------\
|  task --> BUILD
|------------------/
*/
gulp.task('build', ['build:js'], () => {
  gulp.watch(Paths.JS_SRC, ['build:js']);
});

gulp.task('serve', gulpSequence('build', 'browserSync'));

gulp.task('lint', ['lint:js']);

gulp.task('default', ['serve']);