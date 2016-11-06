'use strict';

/*
|--------------------------------\
|  dependencies --> NPM MODULES
|--------------------------------/
*/
import gulp from 'gulp';
import babel from 'gulp-babel';
import clean from 'gulp-clean';
import gulpif from 'gulp-if';
import header from 'gulp-header';
import eslint from 'gulp-eslint';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import rename from 'gulp-rename';
import pkg from './package.json';
import plumber from 'gulp-plumber';
import sass from 'gulp-sass';
import autoprefixer from 'gulp-autoprefixer';
import cleanCss from 'gulp-clean-css';
import sourcemaps from 'gulp-sourcemaps';
import gulpSequence from 'gulp-sequence';
import browserSync from 'browser-sync';
browserSync.create();


/*
|-----------------------\
|  settings --> HEADER
|-----------------------/
*/
const headerText = `/**
  * HammerSlider - <%= pkg.description %>
  * v<%= pkg.version %> | <%= pkg.homepage %>
  * Copyright <%= pkg.author %>
  *
  * <%= pkg.license %> license
  */
  `;


/*
|------------------------------\
|  settings --> PATHS & FLAGS
|------------------------------/
*/
const paths = (() => {
  const srcPath = './src',
    distPath = './dist';

  return {
    OUT: distPath,
    SASS_SRC: `${srcPath}/scss/*.scss`,
    JS_SRC: `${srcPath}/js/*.js`
  };
})();


const flags = ((production) => {
  return {
    DEV: !production,
    PROD: production
  };
})(process.env.NODE_ENV === 'production');


/*
|------------------\
|  task --> CLEAN
|------------------/
*/
gulp.task('clean', () => {
  return gulp.src(`${paths.OUT}/*`, { read: false })
    .pipe(clean());
});


/*
|---------------------\
|  task --> BUILD JS
|---------------------/
*/
gulp.task('build:js', () => {
  return gulp.src(paths.JS_SRC)
    .pipe(plumber())
    .pipe(gulpif(flags.DEV, sourcemaps.init()))
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(concat('hammerslider.js'))
    .pipe(gulpif(flags.PROD, uglify({mangle: true})))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulpif(flags.DEV, sourcemaps.write('.')))
    .pipe(header(headerText, { pkg : pkg } ))
    .pipe(gulp.dest(paths.OUT))
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
    .pipe(eslint.format());
});


/*
|----------------------\
|  task --> BUILD CSS
|----------------------/
*/
gulp.task('build:css', () => {
  return gulp.src(paths.SASS_SRC)
    .pipe(plumber())
    .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: [
        'last 6 versions',
        'ie 10-11',
        '> 5%'
      ]
    }))
    .pipe(gulp.dest(paths.OUT))
    .pipe(browserSync.stream());
});


/*
|------------------------\
|  task --> BROWSERSYNC
|------------------------/
*/
gulp.task('browserSync', () => {
  flags.DEV && browserSync.init({
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
  if (flags.DEV) {
    gulp.watch(paths.JS_SRC, ['build:js']);
    gulp.watch(paths.SASS_SRC, ['build:css']);
  }
});

gulp.task('serve', gulpSequence('clean', 'build', 'browserSync'));

gulp.task('lint', ['lint:js', 'lint:css']);

gulp.task('default', ['serve']);