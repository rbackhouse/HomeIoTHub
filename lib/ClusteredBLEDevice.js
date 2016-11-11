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

const EventEmitter = require('events');
var ClusterManager = require("./ClusterManager");

class ClusteredBLEDevice extends EventEmitter {
	constructor(options) {
		super();
		this.id = options.id;
		this.name = options.name;
		this.rssi = options.rssi;
		this.cmds = options.commands;
		this.hostname = options.hostname;
		this.connected = false;
		
		this.cmds.forEach(function(command) {
			this[command.cmd] = function(done) {
				ClusterManager.sendCommand(this.id, this.hostname, command.cmd, done);
			}.bind(this);
		}.bind(this));
	}
	
	get type() {
		return this.constructor.type();
	}
	
	connect() {
		this.connected = true;
		ClusterManager.connectToDevice(this.id, this.hostname);
	}

	disconnect() {
		this.connected = false;
		ClusterManager.disconnectFromDevice(this.id, this.hostname);
	}

	read(characteristicUUID, cb) {
	}
	
	write(characteristicUUID, data, withoutResponse, cb) {
	}
	
	isConnected() {
		return this.connected;
	}
	
	commands() {
		return this.cmds;
	}
	
	broadcastRead(type, data) {
		this.emit("data", type, data);
	}
	
	static type() {
		return 'ClusteredBLEDevice';
	}
}

module.exports = ClusteredBLEDevice;