'use strict';

/* globals module */

module.exports = function(grunt) {

  // configure project
  grunt.initConfig({
    // make node configurations available
    pkg: grunt.file.readJSON('package.json'),
    csslint: {
      options: {
        csslintrc: 'src/.csslintrc'
      },
      strict: {
        options: {
          import: 2
        },
        src: ['src/content/**/*.css',
          '!src/content/**/*_nolint.css'
        ]
      },
      lax: {
        options: {
          import: false
        },
        src: ['src/content/**/*.css',
          '!src/content/**/*_nolint.css'
        ]
      }
    },
    githooks: {
      all: {
        'pre-commit': 'csslint htmlhint jscs jshint'
      }
    },
    htmlhint: {
      html1: {
        src: [
          'src/content/datachannel/**/index.html',
          'src/content/getusermedia/**/index.html',
          'src/content/peerconnection/**/index.html'
        ]
      }
    },
    jscs: {
      src: [
        'src/content/**/*.js',
        'test/*.js'
      ],
      options: {
        config: 'src/.jscsrc',
        'excludeFiles': []
      }
    },
    jshint: {
      options: {
        ignores: [],
        // use default .jshintrc files
        jshintrc: true
      },
      // files to validate
      // can choose more than one name + array of paths
      // usage with this name: grunt jshint:files
      files: [
        'src/content/**/*.js',
        'test/*.js'
      ]
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
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-htmlhint');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-githooks');

  // set default tasks to run when grunt is called without parameters
  grunt.registerTask('default', ['csslint', 'htmlhint', 'jscs', 'jshint']);
  // also possible to call JavaScript directly in registerTask()
  // or to call external tasks with grunt.loadTasks()
};
