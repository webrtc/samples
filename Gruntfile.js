'use strict';

/* globals module */

module.exports = function(grunt) {
  // configure project
  grunt.initConfig({
    // make node configurations available
    pkg: grunt.file.readJSON('package.json'),
    csslint: {
      options: {
        csslintrc: '.csslintrc'
      },
      src: ['src/content/**/*.css', '!**/third_party/*.css' ]
    },
    eslint: {
      options: {
        configFile: '.eslintrc',
        cache: true
      },
      target: ['src/content/**/*.js', 'test/*.js', '!**/third_party/*.js' ]
    },
    githooks: {
      all: {
        'pre-commit': 'csslint htmlhint eslint'
      }
    },
    htmlhint: {
      html1: {
        src: [
          'src/content/**/*.html',
          '!**/third_party/*.html'
        ]
      }
    },
    // Leaving this as a manual step as the extension is not updated regularly.
    compress: {
      main: {
        options: {
          mode: 'zip',
          archive: 'release/desktopCaptureExtension.zip'
        },
        files: [
          {
            expand: true,
            cwd: 'src/content/extensions/desktopcapture/extension',
            src: '**',
            dest: 'desktopCaptureExtension',
            isfile: true
          }
        ]
      }
    }
  });

  // enable plugins
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-githooks');
  grunt.loadNpmTasks('grunt-htmlhint');

  // set default tasks to run when grunt is called without parameters
  grunt.registerTask('default', ['csslint', 'htmlhint', 'eslint']);
  // also possible to call JavaScript directly in registerTask()
  // or to call external tasks with grunt.loadTasks()
};
