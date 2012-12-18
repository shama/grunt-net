/*
 * grunt-net
 * https://github.com/shama/grunt-net
 *
 * Copyright (c) 2012 Kyle Robinson Young
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
  'use strict';

  // libs
  var dnode = require('dnode');

  // net task
  grunt.registerMultiTask('net', 'Run grunt tasks over a network', function() {
    var port = this.data['port'] || 5004;
    var host = this.data['host'] || 'localhost';
    var tasks = this.data['tasks'] || [];
    var done = this.async();

    // spawn tasks
    function spawnTasks(tasks, inc, cb) {
      if (arguments.length === 2) {
        cb = inc;
        inc = function(err, buf) {};
      }
      grunt.log.ok('Client running tasks: ' + tasks.join(', '));
      var spawned = grunt.util.spawn({
        grunt: true,
        args: tasks
      }, cb);
      spawned.stdout.on('data', function(buf) { inc(null, String(buf)); });
      spawned.stderr.on('data', function(buf) { inc(new Error(String(buf))); });
    }

    // create a server
    function createServer() {
      grunt.log.ok('Registered as a grunt-net server [' + host + ':' + port + '].');
      dnode({ run: spawnTasks }).listen(host, port);
    }

    // prints an 80 char line
    function printLine() {
      grunt.log.writeln(new Array(81).join('-'));
    }

    // determine whether this is a server or client
    var client = dnode.connect(host, port);
    client.on('error', function(err) {
      if (err.code === 'ECONNREFUSED') {
        createServer();
      } else {
        grunt.log.error(err.code + ': ' + err.message);
      }
    });

    // client has connected to server
    client.on('remote', function(server) {
      if (tasks.length < 1) {
        grunt.fatal('Please specify tasks to run.');
        return done(1);
      }
      grunt.log.writeln('Connected to server [' + host + ':' + port + '], running tasks: ' + tasks.join(', ') + '...');
      printLine();
      server.run(tasks, function(err, buf) {
        // incremental updates from server
        grunt.log.write('  ');
        if (err) {
          grunt.log.error(err.message);
        } else {
          grunt.log.write(buf);
        }
      }, function(err, res, code) {
        // finished running tasks
        printLine();
        client.end();
        done();
      });
    });

  });
};
