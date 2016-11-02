'use strict';

/*
|--------------------------------\
|  dependencies --> NPM MODULES
|--------------------------------/
*/
import gulp from 'gulp';
import gutil from 'gutil';
import babel from 'gulp-babel';
import eslint from 'gulp-eslint';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import rename from 'gulp-rename';
import plumber from 'gulp-plumber';
import sass from 'gulp-sass';
import autoprefixer from 'gulp-autoprefixer';
import cleanCss from 'gulp-clean-css';
import sourcemaps from 'gulp-sourcemaps';
import gulpSequence from 'gulp-sequence';
import browserSync from 'browser-sync';
browserSync.create();


/*
|----------------------\
|  settings --> PATHS
|----------------------/
*/
const paths = (() => {
  const srcPath = './src',
    distPath = './dist';

  return {
    OUT: distPath,
    SASS_SRC: `${srcPath}/scss/**/*.scss`,
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
  return gulp.src(paths.JS_SRC)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(concat('hammerslider.js'))
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.JS_OUT))
    .pipe(browserSync.stream());
});


/*
|--------------------\
|  task --> LINT JS
|--------------------/
*/
gulp.task('lint:js', () => {
  return gulp.src(paths.JS_SRC)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});


/*
|----------------------\
|  task --> BUILD CSS
|----------------------/
*/
gulp.task('build:css', () => {
  return gulp.src(paths.SASS_SRC)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', gutil.log))
    .pipe(autoprefixer({
      browsers: [
        'last 6 versions',
        'ie 9-11',
        '> 5%'
      ]
    }))
    .pipe(cleanCss({ advanced: false }))
    .pipe(rename({suffix: '.min'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.SASS_OUT))
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
gulp.task('build', ['build:js', 'build:css'], () => {
  gulp.watch(paths.JS_SRC, ['build:js']);
  gulp.watch(paths.SASS_SRC, ['build:css']);
});

gulp.task('serve', gulpSequence('build', 'browserSync'));

gulp.task('lint', ['lint:js']);

gulp.task('default', ['serve']);