'use strict';

var Q = require('q');
var util = require('util');
var pomelo = require('pomelo');
var quick = require('quick-pomelo');
var pomeloLogger = require('pomelo-logger');
var pomeloConstants = require('pomelo/lib/util/constants');
var pomeloAppUtil = require('pomelo/lib/util/appUtil');
var logger = pomeloLogger.getLogger('pomelo', __filename);

var app = pomelo.createApp();
app.set('name', 'quick-pomelo');

// configure for global
app.configure('all', function() {

	app.enable('systemMonitor');

	app.set('proxyConfig', {
		cacheMsg : true,
		interval : 30,
		lazyConnection : true,
		timeout : 10 * 1000,
		failMode : 'failfast',
	});

	app.set('remoteConfig', {
		cacheMsg : true,
		interval : 30,
		timeout : 10 * 1000,
	});

	// Configure memorydb
	app.loadConfigBaseApp('memorydbConfig', 'memorydb.json');

	// Configure logger
	var loggerConfig = app.getBase() + '/config/log4js.json';
	var loggerOpts = {
		serverId : app.getServerId(),
		base: app.getBase(),
	};
	quick.configureLogger(loggerConfig, loggerOpts);
	pomeloLogger.configure(loggerConfig, loggerOpts);

	// Load components
	app.load(quick.components.memorydb);
	app.load(quick.components.controllers);
	app.load(quick.components.routes);

	// Configure filter
	app.filter(quick.filters.transaction(app));

	// Add beforeStop hook
	app.lifecycleCbs[pomeloConstants.LIFECYCLE.BEFORE_SHUTDOWN] = function(app, shutdown, cancelShutDownTimer){
		cancelShutDownTimer();

		if(app.getServerType() === 'master'){
			// Wait for all server stop
			var tryShutdown = function(){
				if(Object.keys(app.getServers()).length === 0){
					shutdown();
				}
				else{
					setTimeout(tryShutdown, 200);
				}
			}
			tryShutdown();
			return;
		}

		Q.ninvoke(pomeloAppUtil, 'optComponents', app.loaded, 'beforeStop')
		.then(function(){
			shutdown();
		}, function(e){
			logger.error(e.stack);
		});
	};

	app.set('errorHandler', function(err, msg, resp, session, cb){
		resp = {
			code : 500,
			stack : err.stack,
			message : err.message,
		};
		cb(err, resp);
	});
});

//Connector settings
app.configure('all', 'gate|connector', function() {
	app.set('connectorConfig', {
		connector : pomelo.connectors.hybridconnector,
		heartbeat : 30,
	});

	app.set('sessionConfig', {
		singleSession : true,
	});
});

app.configure('development', function(){
	require('heapdump');
	require('q').longStackSupport = true;
	pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.ALL);
});

app.configure('production', function(){
	pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.INFO);
});

process.on('uncaughtException', function(err) {
	logger.error('Uncaught exception: %s', err.stack);
});

app.start();
