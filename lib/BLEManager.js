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

var fs = require('fs');
var path = require('path');
var util = require('util');
var noble = require('noble');
var EventEmitter = require('events');

var deviceHandlers = [];
var peripherals = {};
var devices = {};

class BLEManager extends EventEmitter {
	constructor() {
		super();
	}
	
	sendCommand(id, cmd, done) {
		var device = devices[id];
		if (device && device.isConnected()) {
			device[cmd](done);
		} else {
			done();
		}
	}
	
	getDevices() {
		return devices;
	}
	
	addRemoteDevice(device) {
		devices[device.id] = device;
		this.emit("discover", device);
	}
	
	removeRemoteDevices(hostname) {
		var ids = [];
		for (var id in devices) {
			var device = devices[id];
			if (device.hostname && device.hostname === hostname) {
				delete devices[id];
				ids.push(id);
			}
		}
		return ids;
	}
	
	connectToDevice(id) {
		var device = devices[id];
		if (device && !device.isConnected()) {
			connect(device);
		}
	}
	
	disconnectFromDevice(id) {
		var device = devices[id];
		if (device && device.isConnected()) {
			device.disconnect();
		}
	}
}

var bleManager = new BLEManager();

function loadDevices(p) {
    fs.lstat(p, function(err, stat) {
        if (stat.isFile()) {
        	var deviceHandler = require(p);
        	console.log("Device Handler from "+p+" loaded");
        	deviceHandlers.push(deviceHandler);
        } else {
			fs.readdir(p, function(err, files) {
				files.forEach(function(file) {
                    loadDevices(path.join(p, file));
                });
            });        	
        }
    });
}

var devicesDir = path.join(__dirname, '../devices');
loadDevices(devicesDir);

noble.on('stateChange', function(state) {
	if (state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
});

noble.on('discover', function(peripheral) {
	if (peripheral.advertisement.localName) {
		peripherals[peripheral.id] = peripheral;
		console.log("Discovered "+peripheral.id+" "+peripheral.advertisement.localName+" "+peripheral.rssi);
		deviceHandlers.forEach(function(deviceHandler) {
			if (deviceHandler.is(peripheral)) {
				deviceHandlers.forEach(function(deviceHandler) {
					if (deviceHandler.is(peripheral)) {
						var add = true;
						if (devices[peripheral.id]) {
							if (devices[peripheral.id].rssi > peripheral.rssi) {
								add = false;
								console.log("Remote Device with id ["+peripheral.id+"] has stronger signal ["+devices[peripheral.id].rssi+" < "+peripheral.rssi+"]");
							}
						}
						if (add) {
							console.log("Creating Device with id ["+peripheral.id+"]");
							devices[peripheral.id] = new deviceHandler(peripheral);
							bleManager.emit("discover", devices[peripheral.id]);
						}
					}
				});	
			}
		});
	}
});

function connect(device) {
	if (device.type !== "ClusteredBLEDevice") {
		device.on("disconnected", function() {
			console.log("Device ["+device.id+"] disconnected");
			bleManager.emit("disconnect", device.id);
		});
		device.on("connected", function() {
			console.log("Device ["+device.id+"] connected");
			bleManager.emit("connect", device);
			noble.startScanning();
		});
		noble.stopScanning();
	}	
	device.connect();
}

module.exports = bleManager;
