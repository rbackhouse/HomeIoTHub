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

const fs = require('fs');
const path = require('path');
const util = require('util');
const noble = require('noble');
const EventEmitter = require('events');

let deviceHandlers = [];
let peripherals = {};
let devices = {};

class BLEManager extends EventEmitter {
	constructor() {
		super();
		this.waitForMap = {};
		this.on("discover", (device) => {
			if (this.waitForMap[device.id]) {
				this.waitForMap[device.id].forEach((cb) => {
					cb(device);
				});
				this.waitForMap[device.id] = undefined;
			}
		});
	}
	
	sendCommand(id, cmd, done) {
		let device = devices[id];
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
		let ids = [];
		for (let id in devices) {
			let device = devices[id];
			if (device.hostname && device.hostname === hostname) {
				delete devices[id];
				ids.push(id);
			}
		}
		return ids;
	}
	
	connectToDevice(id) {
		let device = devices[id];
		if (device && !device.isConnected()) {
			connect(device);
		}
	}
	
	disconnectFromDevice(id) {
		let device = devices[id];
		if (device && device.isConnected()) {
			device.disconnect();
		}
	}
	
	waitFor(id, cb) {
		if (devices[id]) {
			cb(devices[id]);
		} else {
			if (!this.waitForMap[id]) {
				this.waitForMap[id] = [];
			}
			this.waitForMap[id].push(cb);
		}
	}
	
	getDeviceTypes() {
		let types = [];
		deviceHandlers.forEach((deviceHandler) => {
			types.push(deviceHandler.type())
		});
		
		return types;
	}
	
	getDeviceCommands(type) {
		let commands = null;
		deviceHandlers.forEach((deviceHandler) => {
			if (deviceHandler.type() === type) {
				commands = deviceHandler.commands();
			}
		});
		return commands;		
	}
	
	setDeviceIds(deviceIds) {
		this.deviceIds = deviceIds;
	}
}

let bleManager = new BLEManager();

function loadDevices(p) {
    fs.lstat(p, (err, stat) => {
        if (stat.isFile()) {
        	if (p.indexOf(".js") === p.length - 3) {
				let deviceHandler = require(p);
				console.log("Device Handler from "+p+" loaded");
				deviceHandlers.push(deviceHandler);
			}	
        } else {
			fs.readdir(p, (err, files) => {
				files.forEach((file) => {
                    loadDevices(path.join(p, file));
                });
            });        	
        }
    });
}

let devicesDir = path.join(__dirname, '../devices');
loadDevices(devicesDir);

noble.on('stateChange', (state) => {
	if (state === 'poweredOn') {
		noble.startScanning();
		console.log('startScanning');
	} else {
		console.log('stopScanning');
		noble.stopScanning();
	}
});

noble.on('discover', (peripheral) => {
	if (bleManager.deviceIds && bleManager.deviceIds.indexOf(peripheral.id) < 0) {
		return;
	}
	if (peripheral.advertisement.localName) {
		peripherals[peripheral.id] = peripheral;
		deviceHandlers.forEach((deviceHandler) => {
			if (deviceHandler.is(peripheral)) {
				let add = true;
				console.log("Discovered "+peripheral.id+" "+peripheral.advertisement.localName+" "+peripheral.rssi);
				if (devices[peripheral.id]) {
					if (devices[peripheral.id].type !== "ClusteredBLEDevice") {
						add = false;
						//console.log("Device with id ["+peripheral.id+"]  has already been created");
					} else if (devices[peripheral.id].rssi > peripheral.rssi) {
						add = false;
						console.log("ClusteredBLEDevice ["+devices[peripheral.id].hostname+"] exists with id ["+peripheral.id+"] and has stronger signal ["+devices[peripheral.id].rssi+" < "+peripheral.rssi+"]");
					}
				}
				if (add) {
					devices[peripheral.id] = new deviceHandler(peripheral);
					console.log("Creating Device with id ["+peripheral.id+"] type ["+devices[peripheral.id].type+"]");
					bleManager.emit("discover", devices[peripheral.id]);
				}
			}
		});	
	}
});

function connect(device) {
	if (device.type !== "ClusteredBLEDevice") {
		device.once("disconnected", () => {
			console.log("Device ["+device.id+"] disconnected");
			bleManager.emit("disconnect", device.id);
		});
		device.once("connected", () => {
			console.log("Device ["+device.id+"] connected");
			bleManager.emit("connect", device);
			noble.startScanning();
		});
		noble.stopScanning();
	}	
	device.connect();
}

module.exports = bleManager;
