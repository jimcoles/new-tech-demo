var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var reactify = require('reactify');

var appDir = "./src/main/javascript/app"
var assetsDir = "./src/main/javascript/assets"
var outDir = "./target/generated-resources/web"

gulp.task('default', function () {
    gulp.start(['build']);
});

gulp.task('browserify', function () {
    return browserify(appDir + '/index.jsx', {
        debug: true,
        transform: [reactify]
    })
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest(outDir));
});

gulp.task('html', function () {
    return gulp.src(assetsDir + '/**/*.html')
        .pipe(gulp.dest(outDir));
});

gulp.task('build', function () {
    gulp.start(['browserify', 'html']);
});

gulp.task('watch', ['build'],
            function () {
                gulp.watch([appDir + '/**/*.jsx', appDir + '/**/*.js'], ['browserify']);
                gulp.watch([assetsDir + '/**/*.html'], ['html']);
            }
         );

