/*
* The MIT License (MIT)
* 
* Copyright (c) 2016 Richard Backhouse
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
* to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
* DEALINGS IN THE SOFTWARE.
*/

var url = require('url');
var path = require('path');
var qs = require('querystring');
var ws = require('ws');
var BLEManager = require("./BLEManager");
var ClusterManager = require("./ClusterManager");

var HttpHandler = function() {
	this.sockets = [];
	BLEManager.on("connect", function(device) {
		var msg = {
			id: device.id,
			name: device.name,
			type: "connected",
			commands: device.commands()
		}
		this.sockets.forEach(function(ws) {
			ws.send(JSON.stringify(msg), function(){});
		});
		device.on("read", function(type, data) {
			var msg = {
				id: device.id,
				name: device.name,
				type: type,
				data: data
			};
			this.sockets.forEach(function(ws) {
				ws.send(JSON.stringify(msg), function(){});
			});
		}.bind(this));
	}.bind(this));

	BLEManager.on("disconnect", function(deviceId) {
		var msg = {
			id: deviceId,
			type: "disconnected"
		};
		this.sockets.forEach(function(ws) {
			ws.send(JSON.stringify(msg), function(){});
		});
	}.bind(this));
	
	BLEManager.on("discover", function(device) {
		var msg = {
			id: device.id,
			name: device.name,
			type: "discover",
			commands: device.commands()
		};
		this.sockets.forEach(function(ws) {
			ws.send(JSON.stringify(msg), function(){});
		});
	}.bind(this));
	
	ClusterManager.on("nodeAdded", function(node) {
		var msg = {
			node: node,
			type: "nodeAdded"
		};
		this.sockets.forEach(function(ws) {
			ws.send(JSON.stringify(msg), function(){});
		});
	}.bind(this));

	ClusterManager.on("nodeRemoved", function(node) {
		var msg = {
			node: node,
			type: "nodeRemoved"
		};
		this.sockets.forEach(function(ws) {
			ws.send(JSON.stringify(msg), function(){});
		});
	}.bind(this));
};

HttpHandler.prototype = {
	startWebSocketServer: function(server) {
		var wss = new ws.Server({server: server});
		wss.on('connection', function(ws) {
			this.sockets.push(ws);
			ws.on('close', function() {
				var index = this.sockets.indexOf(ws);
        		if (index != -1) {
          			this.sockets.splice(index, 1);
          		}
			}.bind(this));
			var currentDevices = BLEManager.getDevices();
			var devices = [];
			for (var id in currentDevices) {
				var device = currentDevices[id];
				var deviceData = {
					id: device.id,
					name: device.name,
					commands: device.commands(),
					rssi: device.rssi,
					hostname: device.hostname || "local"
				};
				devices.push(deviceData);
			}
			var msg = {
				type: "onstart",
				devices: devices,
				nodes: ClusterManager.getNodes()
			}
			ws.send(JSON.stringify(msg), function(){});
		}.bind(this));
	}, 
	handle: function(request, response, next) {
		var path = request.url;
		if (path.charAt(0) == '/') {
			path = path.substring(1);
		}
		var segments = path.split("/");
		if (request.method === "POST") {
			var id = segments[0];
			var cmd = segments[1];
			if (cmd === "connect") {
				BLEManager.connectToDevice(id);
				response.setHeader('Content-Type', 'application/json; charset=UTF-8');
				response.write("{}");
				response.end();
			} else if (cmd === "disconnect") {
				BLEManager.disconnectFromDevice(id);
				response.setHeader('Content-Type', 'application/json; charset=UTF-8');
				response.write("{}");
				response.end();
			} else {
				BLEManager.sendCommand(id, cmd, function() {
					response.setHeader('Content-Type', 'application/json; charset=UTF-8');
					response.write("{}");
					response.end();
				});
			}
		}
	}
};

function createHandler() {
	return new HttpHandler();
}

exports = module.exports = createHandler;
	