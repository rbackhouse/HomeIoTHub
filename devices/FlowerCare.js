/*
* The MIT License (MIT)
* 
* Copyright (c) 2017 Richard Backhouse
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

const BLEDevice = require('../lib/BLEDevice');

const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);

class FlowerCare extends BLEDevice {
	constructor(peripheral) {
		super(peripheral, [DATA_SERVICE_UUID], [DATA_CHARACTERISTIC_UUID, FIRMWARE_CHARACTERISTIC_UUID, REALTIME_CHARACTERISTIC_UUID], []);  
	}
	
	static is(peripheral) {
		return (peripheral.advertisement.localName === 'Flower care');
	}
	
	static type() {
		return 'Flower care';
	}
	
	getReadings() {
		this.read(FIRMWARE_CHARACTERISTIC_UUID, function(err, data) {
			this.emit('read', "firmware", {
				batteryLevel: parseInt(data.toString('hex', 0, 1), 16),
				firmwareVersion: data.toString('ascii', 2, data.length)
			});
		}.bind(this));
		this.write(REALTIME_CHARACTERISTIC_UUID, REALTIME_META_VALUE, false, function() {
			this.read(DATA_CHARACTERISTIC_UUID, function(err, data) {
				this.emit('read', "data", {
					temperature: data.readUInt16LE(0) / 10,
					lux: data.readUInt32LE(3),
					moisture: data.readUInt16BE(6),
					fertility: data.readUInt16LE(8)
				});
			}.bind(this));
			
		}.bind(this));
	}
	
	commands() {
		return [
			{
				cmd: "getReadings", 
				label: "Get Readings" 
			}
		];
	}
	
}

module.exports = FlowerCare;
