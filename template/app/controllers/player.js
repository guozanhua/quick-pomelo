'use strict';

var Q = require('q');

var Controller = function(app){
	this.app = app;

	this.Player = app.models.Player;
};

var proto = Controller.prototype;

proto.create = function(opts){
	var self = this;
	var player = new self.Player(opts);
	var playerId = player._id;
	return Q.fcall(function(){
		return player.saveQ();
	})
	.then(function(){
		var channelId = 'p:' + playerId;
		return self.app.controllers.push.join(channelId, playerId);
	});
};

proto.remove = function(playerId){
	var self = this;
	return Q.fcall(function(){
		return self.Player.findForUpdateQ(playerId);
	})
	.then(function(player){
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		return Q.fcall(function(){
			if(!!player.areaId){
				return self.app.controllers.area.playerQuit(player.areaId, playerId);
			}
		})
		.then(function(){
			if(!!player.teamId){
				return self.app.controllers.team.playerQuit(player.teamId, playerId);
			}
		})
		.then(function(){
			var channelId = 'p:' + playerId;
			return self.app.controllers.push.quit(channelId, playerId);
		})
		.then(function(){
			return self.Player.removeQ(playerId);
		});
	});
};

proto.connect = function(playerId, connectorId){
	var self = this;
	var player = null;
	var oldConnectorId = null;
	return Q.fcall(function(){
		return self.Player.findForUpdateQ(playerId);
	})
	.then(function(ret){
		player = ret;
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		oldConnectorId = player.connectorId;
		player.connectorId = connectorId;
		return player.saveQ();
	})
	.then(function(){
		return self.app.controllers.push.connect(playerId, connectorId);
	})
	.then(function(){
		return oldConnectorId;
	});
};

proto.disconnect = function(playerId){
	var self = this;
	var player = null;
	return Q.fcall(function(){
		return self.Player.findForUpdateQ(playerId);
	})
	.then(function(ret){
		player = ret;
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		player.connectorId = '';
		return player.saveQ();
	})
	.then(function(){
		return self.app.controllers.push.disconnect(playerId);
	});
};

proto.push = function(playerId, route, msg, persistent){
	var channelId = 'p:' + playerId;
	return this.app.controllers.push.push(channelId, null, route, msg, persistent);
};

proto.getMsgs = function(playerId, seq, count){
	var channelId = 'p:' + playerId;
	return this.app.controllers.push.getMsgs(channelId, seq, count);
};

module.exports = function(app){
	return new Controller(app);
};

