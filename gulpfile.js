
var gulp = require('gulp');
var browserify = require('gulp-browserify');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var livereload = require('gulp-livereload');
var uglify = require('gulp-uglify');

// Concatenate & Minify JS
gulp.task('bundle', function() {
    return gulp.src('src/main.js')
        .pipe(plumber())
        .pipe(browserify({
            debug: true,
            transform: ['browserify-shim', 'brfs']
        }))
        // .pipe(uglify())
        .pipe(rename('bundle.js'))
        .pipe(gulp.dest('app/js'))
        .pipe(livereload());
});



// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/**/*.js', ['bundle']);
});


//default task
gulp.task('default', ['bundle', 'watch']);