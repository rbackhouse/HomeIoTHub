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
"use strict";

var WebSocket = require('ws');
var SSDPServer = require('node-ssdp').Server;
var SSDPClient = require('node-ssdp').Client;
var BLEManager = require("./BLEManager");
var ClusteredBLEDevice = require("./ClusteredBLEDevice");
var ip = require("ip");
var url = require('url');
var EventEmitter = require('events');
var sockets = [];

class ClusterManager extends EventEmitter {
	constructor() {
		super();
	}
	
	connectToDevice(id, hostname) {
		var ws = findClient(hostname);
		if (ws) {
			var connectMsg = {
				type: "connect",
				id: id
			};
			console.log("ClusterManager connectToDevice : "+hostname+" "+id);
			ws.send(JSON.stringify(connectMsg));
		}
	}
	
	disconnectFromDevice(id, hostname) {
		var ws = findClient(hostname);
		if (ws) {
			var disconnectMsg = {
				type: "disconnect",
				id: id
			};
			console.log("ClusterManager disconnectFromDevice : "+hostname+" "+id);
			ws.send(JSON.stringify(disconnectMsg));
		}
	}
	
	sendCommand(id, hostname, cmd, done) {
		var ws = findClient(hostname);
		if (ws) {
			var sendCommandMsg = {
				type: "sendCommand",
				id: id,
				cmd: cmd
			};
			console.log("ClusterManager sendCommand : "+hostname+" "+id+" "+cmd);
			ws.send(JSON.stringify(sendCommandMsg));
		}
		done();
	}
	
	getNodes() {
		var nodes = [];
		nodes.push({hostname: "local"});
		sockets.forEach(function each(ws) {
			var wsurl = url.parse(ws.url);
			nodes.push({hostname: wsurl.hostname});
		});
		return nodes;
	}
}

var clusterManager = new ClusterManager();

var server = new SSDPServer();
var client = new SSDPClient();

server.addUSN('upnp:rootdevice');
server.addUSN('urn:schemas-upnp-org:device:HomIoTHub:1');

server.on('advertise-alive', function (headers) {
	//console.log("advertise-alive : "+JSON.stringify(headers));
});

server.on('advertise-bye', function (headers) {
	//console.log("advertise-bye : "+JSON.stringify(headers));
});

server.start();

process.on('exit', function() {
	server.stop()
});

function findClient(hostname) {
	var client;
	sockets.forEach(function each(ws) {
		var wsurl = url.parse(ws.url);
		if (wsurl.hostname === hostname) {
			client = ws;
		}
	});
	return client;
}

client.on('response', function (headers, statusCode, rinfo) {
	if (rinfo.address !== ip.address()) {
		var create = findClient(rinfo.address) === undefined ? true : false;
		if (create) {
			console.log("ssdp discovered : "+rinfo.address);
			var ws = new WebSocket('ws://'+rinfo.address+':12001');
			sockets.push(ws);
			ws.on('open', function open() {
				console.log("Cluster Node added : "+rinfo.address);
				clusterManager.emit("nodeAdded", {hostname: rinfo.address});	
			});

			ws.on('close', function() {
				var index = sockets.indexOf(ws);
				if (index > -1) {
					sockets.splice(index, 1);
				}
				var wsurl = url.parse(ws.url);
				console.log("Cluster Node removed : "+wsurl.hostname);
				var ids = BLEManager.removeRemoteDevices(wsurl.hostname);
				clusterManager.emit("nodeRemoved", {hostname: wsurl.hostname, ids: ids});	
			});
			
			ws.on('message', function(data, flags) {
				var msg = JSON.parse(data);
				switch (msg.type) {
					case "discover":
						console.log("Remote discover : "+JSON.stringify(msg.device));
						var devices = BLEManager.getDevices();
						var id, add = true;
						for (id in devices) {
							if (msg.device.id === id) {
								if (msg.device.rssi < devices[id].rssi) {
									add = false;
									console.log("Remote device : "+JSON.stringify(msg.device)+". existing device has stronger signal");
								} else {
									console.log("Remote device : "+JSON.stringify(msg.device)+". remote device has stronger signal");
								}
							}
						}
						if (add) {
							console.log("Adding remote device : "+JSON.stringify(msg.device));
							BLEManager.addRemoteDevice(new ClusteredBLEDevice(msg.device));
						}
						break;
				}
			});
			
		}
	}	
});

setInterval(function() {
	client.search('urn:schemas-upnp-org:device:HomIoTHub:1');
}, 5000);

var wss = new WebSocket.Server({port: 12001});

wss.on('connection', function(ws) {
	ws.on('message', function(data, flags) {
		var msg = JSON.parse(data);
		switch (msg.type) {
			case "connect":
				console.log("Remote connect : "+msg.id);
				BLEManager.connectToDevice(msg.id);
				break;
			case "disconnect":
				console.log("Remote disconnect : "+msg.id);
				BLEManager.disconnectFromDevice(msg.id);
				break;
			case "sendCommand":
				console.log("Remote sendCommand : "+msg.id+" "+msg.cmd);
				BLEManager.sendCommand(msg.id, msg.cmd, function() {
					console.log("remote device sent command : "+msg.id+" "+msg.cmd);
				});
				break;
			case "read":
				console.log("Remote read : "+msg.readData.id);
				var devices = BLEManager.getDevices();
				for (id in devices) {
					if (id === msg.readData.id && device[id].type === "ClusteredBLEDevice") {
						device[id].broadcastRead(msg.readData.type, msg.readData.data);
					}
				}						
				break;
		}
	});
	
	var devices = BLEManager.getDevices();
	var id;
	for (id in devices) {
		var d = devices[id];
		if (d.type !== "ClusteredBLEDevice") {
			var discoverMsg = {
				type: "discover", 
				device: {
					id: d.id, 
					name: d.name, 
					rssi: d.rssi, 
					commands: d.commands(),
					hostname: ip.address()
				}
			};
			ws.send(JSON.stringify(discoverMsg));
		}
	}
});

BLEManager.on("discover", function(device) {
	if (device.type !== "ClusteredBLEDevice") {
		var discoverMsg = {
			type: "discover", 
			device: {
				id: device.id, 
				name: device.name, 
				rssi: device.rssi, 
				commands: device.commands(),
				hostname: ip.address()
			}
		};
		wss.clients.forEach(function each(ws) {
			ws.send(JSON.stringify(discoverMsg));
		});
	}
});

BLEManager.on("connect", function(device) {
	device.on("read", function(type, data) {
		var readMsg = {
			type: "read", 
			readData : {
				id: device.id,
				name: device.name,
				type: type,
				data: data
			}
		};
		wss.clients.forEach(function each(ws) {
			ws.send(JSON.stringify(readMsg));
		});
	}.bind(this));
});

BLEManager.on("disconnect", function(deviceId) {
});

module.exports = clusterManager;