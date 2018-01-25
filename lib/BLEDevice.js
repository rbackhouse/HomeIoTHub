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

const hexChar = ["0", "1", "2", "3", "4", "5", "6", "7","8", "9", "A", "B", "C", "D", "E", "F"];

class BLEDevice extends EventEmitter {
	constructor(peripheral, serviceUUIDs, characteristicUUIDs, notifyCharacteristics) {
		super();
		this.peripheral = peripheral;
		this.serviceUUIDs = serviceUUIDs;
		this.characteristicUUIDs = characteristicUUIDs;
		this.notifyCharacteristics = notifyCharacteristics;
		this.id = this.peripheral.id;
		this.name = peripheral.advertisement.localName;
		this.rssi = peripheral.rssi;
		
		this.connected = false;
	
		this.peripheral.on('connect', () => {
			console.log("connected : "+this.id);
			this.connected = true;
			if (this.serviceUUIDs && this.characteristicUUIDs) {
				this.peripheral.discoverSomeServicesAndCharacteristics(this.serviceUUIDs, this.characteristicUUIDs, 
					(error, services, characteristics) => {
						if (error) {
							this.emit("error", error);
							return;
						}
						this.services = services;
						this.characteristics = characteristics;
						this.emit("connected", this);
						characteristics.forEach((characteristic) => {
							if (this.notifyCharacteristics.indexOf(characteristic.uuid) != -1) {
								characteristic.on("data", (data, isNotification) => {
									this.emit("data", characteristic.uuid, data, isNotification);
								});
								//characteristic.notify(true);
								characteristic.subscribe((error) => {
									if (error) {
										this.emit("error", error);
									}
        						});
							}
						});
					}
				);
			} else {
				this.emit("connected", this);
			}
		});
		this.peripheral.on('disconnect', () => {
			console.log("disconnected : "+this.id);
			this.connected = false;
			this.emit("disconnected", this);
		});
	}
	
	get type() {
		return this.constructor.type();
	}
	
	connect() {
		console.log("connect : "+this.id);
		this.peripheral.connect((err) => {
			if (err) {
				console.log("error connecting  : "+this.id+" error : "+err);
				this.emit("error", err);
			} else {
				console.log("successful connection : "+this.id);
			}
		});	
	}

	disconnect() {
		console.log("disconnect : "+this.id);
		this.peripheral.disconnect((err) => {
			this.services = undefined;
			this.characteristics = undefined;
			if (err) {
				console.log("error disconnecting  : "+this.id+" error : "+err);
				this.emit("error", err);
			} else {
				console.log("successful disconnection : "+this.id);
			}
		});	
	}

	read(characteristicUUID, cb) {
		this.characteristics.forEach((characteristic) => {
			if (characteristic.uuid === characteristicUUID) {
				characteristic.read((err, data) => {
					if (err) {
						console.log("error reading for "+characteristicUUID+" error : "+err);
						this.emit("error", err);
					}
					cb(err, data);
				});
			}
		});
	}
	
	write(characteristicUUID, data, withoutResponse, cb) {
		this.characteristics.forEach((characteristic) => {
			if (characteristic.uuid === characteristicUUID) {
				characteristic.write(data, withoutResponse, (err) => {
					if (err) {
						console.log("error writing with "+characteristicUUID+" error : "+err);
						this.emit("error", err);
					}
					cb(err);
				});
			}
		});
	}
	
	isConnected() {
		return this.connected;
	}
	
	commands() {
		return [];
	}
	
	static type() {
		return 'BLEDevice';
	}
	
	static byteToHex(b) {
		return hexChar[(b >> 4) & 0x0f] + hexChar[b & 0x0f];
	}

	static arrayToStr(hex) {
		let dataStr = '';
		for (let i = 0; i < hex.length; i++) {
			dataStr += BLEDevice.byteToHex(hex[i]);
			dataStr += ' ';
		}
		return dataStr;
	}
}

module.exports = BLEDevice;