'use strict';

/* globals module */

module.exports = function(grunt) {

  // configure project
  grunt.initConfig({
    // make node configurations available
    pkg: grunt.file.readJSON('package.json'),

    csslint: {
      options: {
        csslintrc: 'samples/web/.csslintrc'
      },
      strict: {
        options: {
          import: 2
        },
        src: ['samples/web/content/**/*.css',
              '!samples/web/content/**/*_nolint.css',
              '!samples/web/content/testrtc/bower_components/**/*.css'
        ]
      },
      lax: {
        options: {
          import: false
        },
        src: ['samples/web/content/**/*.css',
              '!samples/web/content/**/*_nolint.css',
              '!samples/web/content/testrtc/bower_components/**/*.css'
        ]
      }
    },

    htmlhint: {
      html1: {
        src: [
        'samples/web/content/apprtc/index.html',
        'samples/web/content/datachannel/index.html',
        'samples/web/content/getusermedia/**/index.html',
        'samples/web/content/peerconnection/**/index.html'
        ]
      }
    },

    jscs: {
      src: 'samples/web/content/**/*.js',
      options: {
        config: 'google', // as per Google style guide – could use '.jscsrc' instead
        'excludeFiles': [
        'samples/web/content/manual-test/**/*',
        'samples/web/content/apprtc/js/compiled/*.js',
        'samples/web/content/apprtc/js/vr.js',
        'samples/web/content/apprtc/js/stereoscopic.js',
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
        'samples/web/content/apprtc/js/compiled/*.js',
        'samples/web/content/apprtc/js/stereoscopic.js',
        'samples/web/content/apprtc/js/ga.js',
        'samples/web/content/apprtc/js/vr.js',
        'samples/web/content/testrtc/bower_components/**'
        ],
        // use default .jshintrc files
        jshintrc: true
      },
      // files to validate
      // can choose more than one name + array of paths
      // usage with this name: grunt jshint:files
      files: ['samples/web/content/**/*.js']
    },

    shell: {
      runPythonTests: {
        command: './run_python_tests.sh'
      },
    },

    'grunt-chrome-build' : {
      apprtc: {
        options: {
          buildDir: 'build/chrome-app',
          zipFile: 'build/chrome-app/apprtc.zip',
          // If values for chromeBinary and keyFile are not provided, the packaging
          // step will be skipped.
          // chromeBinary should be set to the Chrome executable on your system.
          chromeBinary: null,
          // keyFile should be set to the key you want to use to create the crx package
          keyFile: null
        },
        files: [
          {
            expand: true,
            cwd: 'samples/web/content/apprtc',
            src: [
              '**/*.js',
              '!**/*test.js',
              '**/*.css',
              'images/apprtc*.png',
              'manifest.json',
              '!*.pem'
            ],
            dest: 'build/chrome-app/'
          }
        ]
      }
    },

    jstdPhantom: {
      options: {
        useLatest : true,
        port: 9876,
      },
      files: [
        'samples/web/content/apprtc/js_test_driver.conf',
      ]},

    closurecompiler: {
      debug: {
        files: {
          'samples/web/content/apprtc/js/compiled/apprtc.debug.js': [
            'samples/web/content/apprtc/js/adapter.js',
            'samples/web/content/apprtc/js/appcontroller.js',
            'samples/web/content/apprtc/js/call.js',
            'samples/web/content/apprtc/js/infobox.js',
            'samples/web/content/apprtc/js/peerconnectionclient.js',
            'samples/web/content/apprtc/js/sdputils.js',
            'samples/web/content/apprtc/js/signalingchannel.js',
            'samples/web/content/apprtc/js/stats.js',
            'samples/web/content/apprtc/js/util.js',
          ]
        },
        options: {
          'compilation_level': 'WHITESPACE_ONLY',
          'language_in': 'ECMASCRIPT5'
        },
      },
    },
  });

  // enable plugins
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-htmlhint');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-jstestdriver-phantomjs');
  grunt.loadNpmTasks('grunt-closurecompiler');
  grunt.loadTasks('grunt-chrome-build');

  // set default tasks to run when grunt is called without parameters
  grunt.registerTask('default', ['csslint', 'htmlhint', 'jscs', 'jshint',
                     'shell:runPythonTests', 'jstdPhantom',
                     'closurecompiler:debug']);
  grunt.registerTask('build', ['grunt-chrome-build']);
  // also possible to call JavaScript directly in registerTask()
  // or to call external tasks with grunt.loadTasks()
};
