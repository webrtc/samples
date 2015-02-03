'use strict';

module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-jinja');

  grunt.registerMultiTask('grunt-chrome-build', 'Build packaged Chrome app from sources.', function () {
    grunt.log.writeln('Chrome packaged app build.');

    var options = this.options();

    // Steps:
    // 1. Delete existing build dir if it exists.
    var buildDir = options.buildDir;
    if (!buildDir) {
      throw grunt.util.error('Missing required buildDir option.');
    }
    grunt.log.writeln('Deleting buildDir: ' + buildDir);
    grunt.file.delete(buildDir);

    // 2. Create build dir.
    grunt.log.writeln('Creating empty buildDir: ' + buildDir);
    grunt.file.mkdir(buildDir);

    // 3. Copy sources to build dir.
    grunt.log.writeln('Copying resources to buildDir: ' + buildDir);
    this.files.forEach(function (f) {
      grunt.file.copy(f.src, f.dest);
    });

    grunt.option('grunt-chrome-build-options', options);
    grunt.task.run(
      'grunt-chrome-build-transform',
      'grunt-chrome-build-compress',
      'grunt-chrome-build-package'
    );
  });

  grunt.registerTask('grunt-chrome-build-transform', 'Transform templates to build directory.', function () {
    var options = grunt.option('grunt-chrome-build-options');
    // 4. Transform template file.
    grunt.log.writeln('Transforming files using jinja.');
    grunt.config.set('jinja.chrome-build', {
      options: {
        templateDirs: ['samples/web/content/apprtc'],
        contextRoot: 'samples/web/content/apprtc'
      },
      files: [{
        src: 'samples/web/content/apprtc/index.html',
        dest: 'build/chrome-app/appwindow.html'

      }]
    });
    grunt.task.run('jinja:chrome-build');
  });

  grunt.registerTask('grunt-chrome-build-compress', 'Create zip file in build directory.', function () {
    var options = grunt.option('grunt-chrome-build-options');
    var buildDir = options.buildDir;
    // 5. Create zip file.
    var zipFile = options.zipFile;
    if (!zipFile) {
      throw grunt.util.error('Missing required zipFile option.');
    }
    grunt.log.writeln('Creating zip file:' + zipFile);
    grunt.config.set('compress.chrome-build', {
      options: {
        archive: zipFile
      },
      files: [{
        expand: true,
        cwd: buildDir,
        src: ['**/*']
      }]
    });

    grunt.task.run('compress:chrome-build');
  });

  grunt.registerTask('grunt-chrome-build-package', 'Create crx package file in build directory.', function () {
    var options = grunt.option('grunt-chrome-build-options');
    // This section does not work yet.
    // 6. Call chrome to create crx file.
    var done = this.async();
    var chromeBinary = options.chromeBinary;
    var keyFile = options.keyFile;
    if (!chromeBinary || !keyFile) {
      grunt.log.writeln('Skipping creation of Chrome package.');
      done(true);
    } else {
      grunt.log.writeln('Calling Chrome to create package.');

      var args = [
        '--pack-extension=' + buildDir,
        '--pack-extension-key=' + keyFile
      ];

      grunt.log.write(chromeBinary + ' ' + args.join(' '));

      grunt.util.spawn({
        cmd: chromeBinary,
        args: []
      }, function (error, result, code) {
        if (error || code !== 0) {
          grunt.log.error();
          grunt.log.error(result.stdout);
          grunt.log.error(result.stderr);
          done(false);
        } else {
          grunt.log.ok();
          done(true);
        }
      });
    }
  });
};
