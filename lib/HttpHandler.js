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

const url = require('url');
const path = require('path');
const qs = require('querystring');
const ws = require('ws');
const BLEManager = require("./BLEManager");
const ClusterManager = require("./ClusterManager");

const HttpHandler = function() {
	this.sockets = [];
	BLEManager.on("connect", (device) => {
		let msg = {
			id: device.id,
			name: device.name,
			type: "connected",
			commands: device.commands()
		}
		this.sockets.forEach((ws) => {
			ws.send(JSON.stringify(msg));
		});
		device.on("read", (type, data) => {
			let msg = {
				id: device.id,
				name: device.name,
				type: type,
				data: data
			};
			this.sockets.forEach((ws) => {
				ws.send(JSON.stringify(msg));
			});
		});
	});

	BLEManager.on("disconnect", (deviceId) => {
		let msg = {
			id: deviceId,
			type: "disconnected"
		};
		this.sockets.forEach((ws) => {
			ws.send(JSON.stringify(msg));
		});
	});
	
	BLEManager.on("discover", (device) => {
		let msg = {
			id: device.id,
			name: device.name,
			type: "discover",
			commands: device.commands()
		};
		this.sockets.forEach((ws) => {
			ws.send(JSON.stringify(msg));
		});
	});
	
	ClusterManager.on("nodeAdded", (node) => {
		let msg = {
			node: node,
			type: "nodeAdded"
		};
		this.sockets.forEach((ws) => {
			ws.send(JSON.stringify(msg));
		});
	});

	ClusterManager.on("nodeRemoved", (node) => {
		let msg = {
			node: node,
			type: "nodeRemoved"
		};
		this.sockets.forEach((ws) => {
			ws.send(JSON.stringify(msg));
		});
	});
};

HttpHandler.prototype = {
	startWebSocketServer: (server) => {
		let wss = new ws.Server({server: server});
		wss.on('connection', (ws) => {
			this.sockets.push(ws);
			ws.on('close', () => {
				let index = this.sockets.indexOf(ws);
        		if (index != -1) {
          			this.sockets.splice(index, 1);
          		}
			});
			let currentDevices = BLEManager.getDevices();
			let devices = [];
			for (let id in currentDevices) {
				let device = currentDevices[id];
				let deviceData = {
					id: device.id,
					name: device.name,
					commands: device.commands(),
					rssi: device.rssi,
					hostname: device.hostname || "local"
				};
				devices.push(deviceData);
			}
			let msg = {
				type: "onstart",
				devices: devices,
				nodes: ClusterManager.getNodes()
			}
			ws.send(JSON.stringify(msg));
		});
	}, 
	handle: (request, response, next) => {
		let path = request.url;
		if (path.charAt(0) == '/') {
			path = path.substring(1);
		}
		let segments = path.split("/");
		if (request.method === "GET") {
			if (segments[0] === "devices") {
				let currentDevices = BLEManager.getDevices();
				let devices = [];
				for (let id in currentDevices) {
					let device = currentDevices[id];
					let deviceData = {
						id: device.id,
						name: device.name
					};
					devices.push(deviceData);
				}
				response.setHeader('Content-Type', 'application/json; charset=UTF-8');
				response.write(JSON.stringify(devices));
				response.end();
			} else 	if (segments[0] === "devicetypes") {
				let deviceTypes = BLEManager.getDeviceTypes();
				let types = {};
				deviceTypes.forEach((type) => {
					types[type] = BLEManager.getDeviceCommands(type);
				});
				response.setHeader('Content-Type', 'application/json; charset=UTF-8');
				response.write(JSON.stringify(types));
				response.end();
			}
		} else if (request.method === "POST") {
			let id = segments[0];
			let cmd = segments[1];
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
	