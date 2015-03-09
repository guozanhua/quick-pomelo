'use strict';

var Q = require('q');

var Handler = function(app){
	this.app = app;
};

var proto = Handler.prototype;

proto.create = function(msg, session, next){
	var opts = msg.opts;

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.team.createArea(opts);
	}).nodeify(next);
};

proto.remove = function(msg, session, next){
	var teamId = msg.teamId || session.uid;
	if(!teamId){
		return next(new Error('teamId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.team.removeArea(teamId);
	}).nodeify(next);
};

proto.join = function(msg, session, next){
	var playerId = session.uid;
	var teamId = msg.teamId;
	if(!playerId || !teamId){
		return next(new Error('playerId or teamId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.team.join(teamId, playerId);
	}).nodeify(next);
};

proto.quit = function(msg, session, next){
	var playerId = session.uid;
	if(!playerId){
		return next(new Error('playerId is missing'));
	}

	var self = this;
	Q.fcall(function(){
		return self.app.controllers.team.quit(playerId);
	}).nodeify(next);
};

module.exports = function(app){
	return new Handler(app);
};
