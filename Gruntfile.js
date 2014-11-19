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
      strict: {
        options: {
          import: 2
        },
        src: ['samples/web/content/**/*.css',
              'apprtc/webapp/**/*.css',
              '!samples/web/content/testrtc/bower_components/**/*.css'
        ]
      },
      lax: {
        options: {
          import: false
        },
        src: ['samples/web/content/**/*.css',
              'apprtc/webapp/**/*.css',
              '!samples/web/content/testrtc/bower_components/**/*.css'
        ]
      }
    },

    htmlhint: {
      html1: {
        src: [
        'apprtc/webapp/index.html',
        'samples/web/content/datachannel/index.html',
        'samples/web/content/getusermedia/**/index.html',
        'samples/web/content/peerconnection/**/index.html'
        ]
      }
    },

    jscs: {
      src: ['samples/web/content/**/*.js',
            'apprtc/webapp/**/*.js'
      ],
      options: {
        config: 'google', // as per Google style guide – could use '.jscsrc' instead
        'excludeFiles': [
        'samples/web/content/manual-test/**/*',
        'apprtc/webapp/js/vr.js',
        'apprtc/webapp/js/stereoscopic.js',
        'samples/web/content/getusermedia/desktopcapture/extension/content-script.js',
        'samples/web/content/testrtc/bower_components/**'
        ],
        requireCurlyBraces: ['if']
      }
    },

    jshint: {
      options: {
        ignores: [
        'samples/web/content/manual-test/**/*',
        'samples/web/content/getusermedia/desktopcapture/**',
        'apprtc/webapp/js/stereoscopic.js',
        'apprtc/webapp/js/ga.js',
        'apprtc/webapp/js/vr.js',
        'samples/web/content/testrtc/bower_components/**'
        ],
        // use default .jshintrc files
        jshintrc: true
      },
      // files to validate
      // can choose more than one name + array of paths
      // usage with this name: grunt jshint:files
      files: ['samples/web/content/**/*.js',
              'apprtc/webapp/**/*.js',
      ]
    },

  });

  // enable plugins
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-htmlhint');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // set default tasks to run when grunt is called without parameters
  grunt.registerTask('default', ['csslint', 'htmlhint', 'jscs', 'jshint']);
  // also possible to call JavaScript directly in registerTask()
  // or to call external tasks with grunt.loadTasks()
};
