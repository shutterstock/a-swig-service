var argv = require('optimist').argv;
var config = require('config');
var log4js = require('log4js');
var logger = log4js.getLogger('console');
var connectStatsd = require('connect-statsd');
var swig = require('swig');
var path = require('path');
var dive = require('dive');
var fs = require('fs');

// Better Logging, this makes all console output timesmaped which is useful
log4js.replaceConsole();

// Additional loggers
var responseTimer = log4js.getLogger('resp-timer');
var serverCrash = log4js.getLogger('serv-crash');

var workers = argv.workers || 2;
var translation_file = argv.translations || config.translations;
var template_path = argv.templates;
if(!template_path) throw new Error("Template dir not specified");
template_path = path.resolve(template_path);

if (config.statsd) {
  var statsd = connectStatsd(config.statsd);
  var statsd_client = statsd.getClient();
}

// Log uncaught exceptions before crashing
process.on('uncaughtException', function(err) {
  serverCrash.error(err);
  if (statsd) {
    statsd_client.increment('uncaught_exception');
  }
  process.exit(1);
});

exports.run = function() {
  var routes = require('./routes');
  var express = require('express');
  var app = express();
  var i18n = require('swig-i18n');
	var isString = require('./lib/filter/is_string');

  // Configuration
  app.configure(function() {
    app.use(express.json({limit: '50mb'}));
    app.use(express.methodOverride());
    app.use(log4js.connectLogger(responseTimer, {
      'format': ':method :url :response-timems'
    }));
    // Add statsD if not in local environment
    if (config.statsd) {
      app.use(statsd.middleware());
    }

    app.set("template_path", template_path);
    if (translation_file) {
      logger.info("Loading translations: " + translation_file);
      var translations = JSON.parse(fs.readFileSync(translation_file));
      i18n.init(translations);
    }
		isString.init();

    var html_file_re = /\.html$/;
    dive(template_path, function(err, file) {
      if(err) {
        logger.error("Error diving into template_path for preloading: " + err);
        return;
      }
      if (file.match(html_file_re)) {
        logger.info("Preloading " + file);
        try {
          // We expicitly use renderFile here for the reason
          // that we suspect that v8 does some optimizations on
          // JS code that is run. compileTemplate doesn't actually run
          // the generated js code. This in a sense pays the
          // performance penalty for initial compilation up-front.
          swig.renderFile(file, {});
        }
        catch(e) {
          logger.info("Cannot preload " + file + ": " + e);
        }
      }
    });
    app.set("swig", swig);
    app.use(app.router);
  });

  // Add routes
  routes.initialize(app);

  app.configure('dev', 'development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('prod', 'qa', function() {
    app.use(express.errorHandler());
  });

  //Start server
  var port = argv.port || process.env.HTTP_PORT || 8004;
  var server = app.listen(port);

  // Log current configuration
  logger.info('Express server listening on port %d in %s mode', port, app.settings.env);
  logger.info('Final configuration: ', JSON.stringify(config));
  return server;
};

var master = require('yacm');
exports.run_cluster = function() {
  if(master.isMaster) {
    var files = [template_path];
    if (translation_file) files.push(translation_file);
    master.run({
      startupTimeout: 10000,
      disconnectTimeout: 5000,
      watchFiles: files
    });
  } else {
    exports.run();
  }
};
