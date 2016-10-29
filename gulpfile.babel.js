'use strict';

/*
|--------------------------------\
|  dependencies --> NPM MODULES
|--------------------------------/
*/
import gulp from 'gulp';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import rename from 'gulp-rename';
import sourcemaps from 'gulp-sourcemaps';
import gulpSequence from 'gulp-sequence';
import browserSync from 'browser-sync';
browserSync.create();

/*
|------------------------------------\
|  settings --> RELEASE/DEV & PATHS
|------------------------------------/
*/
const Paths = (() => {
  const srcPath = './src',
    distPath = './dist';

  return {
    OUT: distPath,
    SASS_IN: srcPath + '/scss/style.scss',
    SASS_OUT: distPath + '/css/',
    JS_IN: srcPath + '/js/',
    JS_OUT: distPath + '/js/'
  };
})();


/*
|---------------------\
|  task --> BUILD JS
|---------------------/
*/
gulp.task('build:js', function() {
  return gulp.src([
      Paths.JS_IN + 'raf-polyfill.js',
      Paths.JS_IN + 'touch-swipe.js',
      Paths.JS_IN + 'hammer-slider.js' 
    ])
    //.pipe(plumber())
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
  gulp.watch(Paths.JS_IN + '*.js', ['build:js']);
});

gulp.task('serve', gulpSequence('build', 'browserSync'));

gulp.task('default', ['serve']);