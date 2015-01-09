'use strict';

module.exports = function(grunt) {

  grunt.registerMultiTask('grunt-chrome-build', 'Build packaged Chrome app from sources.', function() {
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-jinja');
    
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
    this.files.forEach(function(f) {
      grunt.file.copy(f.src, f.dest);
    });
    
    // 4. Transform template file.
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

    // 5. Create zip file.
    var zipFile = options.zipFile;
    if (!zipFile) {
      throw grunt.util.error('Missing required zipFile option.');
    }
    grunt.config.set('compress.chrome-build', {
      options: { archive: zipFile },
      files: [
        {
          expand: true, 
          cwd: buildDir,  
          src: ['**/*']
        }
      ]
    });
    
    grunt.task.run('compress:chrome-build');
    
    // This section does not work yet.
    // 6. Call chrome to create crx file.
    /*
    var done = this.async();
    var chromeBinary = options.chromeBinary;
    if (!chromeBinary)
    {
      throw grunt.util.error('Missing required chromeBinary option.')
    }
    
    var keyFile = options.keyFile;
    if (!keyFile)
    {
      throw grunt.util.error('Missing required keyFile option.');
    }
    
    grunt.log.writeln('Calling Chrome to create package.');
    
    var args = [
      '--pack-extension=' + buildDir,
      '--pack-extension-key=' + keyFile
    ];
  
    grunt.log.write(chromeBinary + ' ' + args.join(' '));
    
    grunt.util.spawn({ cmd: chromeBinary, args: []}, function(error, result, code) {
      if (error || code !== 0)
      {
        grunt.log.error();
        grunt.log.error(result.stdout);
        grunt.log.error(result.stderr);
        done(false);
      }
      else
      {
        grunt.log.ok();
        done(true);
      }
    });
    */
  });
};