'use strict';

/* globals module */

module.exports = function(grunt) {

  // configure project
  grunt.initConfig({
    // make node configurations available
    pkg: grunt.file.readJSON('package.json'),

    htmlhint: {
      html1: {
        src: ['samples/web/content/datachannel/index.html',
        'samples/web/content/apprtc/index.html',
        'samples/web/content/getusermedia/**/index.html',
        'samples/web/content/peerconnection/**/index.html']
      }
    },

    jshint: {
      options: {
        ignores: ['samples/web/content/manual-test/**/*',
        'samples/web/content/testrtc/**/*',
        'samples/web/content/getusermedia/desktopcapture/**',
        'samples/web/content/apprtc/js/stereoscopic.js',
        'samples/web/content/apprtc/js/ga.js',
        'samples/web/content/apprtc/js/vr.js'],
        // use default .jshintrc files
        jshintrc: true
      },
      // files to validate
      // can choose more than one name + array of paths
      // usage with this name: grunt jshint:files
      files: ['samples/web/content/**/*.js']
    },

    });

  // Load plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-htmlhint');
};
