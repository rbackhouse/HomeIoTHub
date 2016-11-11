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

var BLEDevice = require('../lib/BLEDevice');

var SIMPLE_KEY_UUID                         = 'ffe0';
var SIMPLE_KEY_DATA_UUID                    = 'ffe1';

var IR_TEMPERATURE_UUID                     = 'f000aa0004514000b000000000000000';
var IR_TEMPERATURE_CONFIG_UUID              = 'f000aa0204514000b000000000000000';
var IR_TEMPERATURE_DATA_UUID                = 'f000aa0104514000b000000000000000';
var IR_TEMPERATURE_PERIOD_UUID              = 'f000aa0304514000b000000000000000';

var HUMIDITY_UUID                           = 'f000aa2004514000b000000000000000';
var HUMIDITY_CONFIG_UUID                    = 'f000aa2204514000b000000000000000';
var HUMIDITY_DATA_UUID                      = 'f000aa2104514000b000000000000000';
var HUMIDITY_PERIOD_UUID                    = 'f000aa2304514000b000000000000000';

var BAROMETRIC_PRESSURE_UUID                = 'f000aa4004514000b000000000000000';
var BAROMETRIC_PRESSURE_CONFIG_UUID         = 'f000aa4204514000b000000000000000';
var BAROMETRIC_PRESSURE_DATA_UUID           = 'f000aa4104514000b000000000000000';
var BAROMETRIC_PRESSURE_PERIOD_UUID         = 'f000aa4404514000b000000000000000';

var MPU9250_UUID                            = 'f000aa8004514000b000000000000000';
var MPU9250_CONFIG_UUID                     = 'f000aa8204514000b000000000000000';
var MPU9250_DATA_UUID                       = 'f000aa8104514000b000000000000000';
var MPU9250_PERIOD_UUID                     = 'f000aa8304514000b000000000000000';

var IO_UUID                                 = 'f000aa6404514000b000000000000000';
var IO_DATA_UUID                            = 'f000aa6504514000b000000000000000';
var IO_CONFIG_UUID                          = 'f000aa6604514000b000000000000000';

var LUXOMETER_UUID                          = 'f000aa7004514000b000000000000000';
var LUXOMETER_CONFIG_UUID                   = 'f000aa7204514000b000000000000000';
var LUXOMETER_DATA_UUID                     = 'f000aa7104514000b000000000000000';
var LUXOMETER_PERIOD_UUID                   = 'f000aa7304514000b000000000000000';

var MPU9250_GYROSCOPE_MASK                  = 0x0007;
var MPU9250_ACCELEROMETER_MASK              = 0x0238;
var MPU9250_MAGNETOMETER_MASK               = 0x0040;

var on = [0x01];
var off = [0x00];

class SensorTag2650 extends BLEDevice {
	constructor(peripheral) {
		super(peripheral, 
			[IR_TEMPERATURE_UUID, MPU9250_UUID, LUXOMETER_UUID], 
			[
				IR_TEMPERATURE_CONFIG_UUID,
				IR_TEMPERATURE_DATA_UUID,
				IR_TEMPERATURE_PERIOD_UUID,
				MPU9250_CONFIG_UUID,
				MPU9250_DATA_UUID,
				MPU9250_PERIOD_UUID,
				LUXOMETER_CONFIG_UUID,
				LUXOMETER_DATA_UUID,
				LUXOMETER_PERIOD_UUID
			], 
			[IR_TEMPERATURE_DATA_UUID, MPU9250_DATA_UUID, LUXOMETER_DATA_UUID]
		);  
		this.on("data", function(uuid, data) {
			this._onRead(uuid, data);
		}.bind(this));
	}

	static is(peripheral) {
		return (peripheral.advertisement.localName === 'CC2650 SensorTag');
	}

	_onRead(uuid, data) {
		switch(uuid) {
			case IR_TEMPERATURE_DATA_UUID: 
				var ambientTemperature = data.readInt16LE(2) / 128.0;
				var objectTemperature = data.readInt16LE(0) / 128.0;		
				this.emit('read', "irtemp", {ambientTemperature: ambientTemperature, objectTemperature: objectTemperature});
				break;
			case MPU9250_DATA_UUID: 
				var xG = data.readInt16LE(0) / 128.0;
				var yG = data.readInt16LE(2) / 128.0;
				var zG = data.readInt16LE(4) / 128.0;
				var x = data.readInt16LE(6) / 4096.0;
				var y = data.readInt16LE(8) / 4096.0;
				var z = data.readInt16LE(10) / 4096.0;
				var xM = data.readInt16LE(12) * 4912.0 / 32768.0;
				var yM = data.readInt16LE(14) * 4912.0 / 32768.0;
				var zM = data.readInt16LE(16) * 4912.0 / 32768.0;
				this.emit('read', "accel", {x: x, y: y, z: z, xG: xG, yG: yG, zG: zG, xM: xM, yM: yM, zM: zM});
				break;
			case LUXOMETER_DATA_UUID:
				var rawLux = data.readUInt16LE(0);
				var exponent = (rawLux & 0xF000) >> 12;
				var mantissa = (rawLux & 0x0FFF);
				var flLux = mantissa * Math.pow(2, exponent) / 100.0;		
				this.emit('read', "lux", {flLux: flLux});
				break;
		}
	}

	turnOnTemp(done) {
		this.write(IR_TEMPERATURE_CONFIG_UUID, new Buffer(new Uint8Array(on)), true, function(){
			this.write(IR_TEMPERATURE_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		}.bind(this));
	}

	turnOffTemp(done) {
		this.write(IR_TEMPERATURE_CONFIG_UUID, new Buffer(new Uint8Array(off)), true, done);
	}

	turnOnAccel(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0x7f, 0x00])), true, function(){
			this.write(MPU9250_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		}.bind(this));
	}

	turnOffAccel(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0x00, 0x00])), true, done);
	}

	turnOnLux(done) {
		this.write(LUXOMETER_CONFIG_UUID, new Buffer(new Uint8Array(on)), true, function(){
			this.write(LUXOMETER_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		}.bind(this));
	}

	turnOffLux(done) {
		this.write(LUXOMETER_CONFIG_UUID, new Buffer(new Uint8Array(off)), true, done);
	}

	turnOnMotion(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0xff, 0x00])), true, function(){
			this.write(MPU9250_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		}.bind(this));
	}

	turnOffMotion(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0x00, 0x00])), true, done);
	}

	commands() {
		return [
			{
				cmd: "turnOnTemp",
				label: "Turn on Temperature"
			},
			{
				cmd: "turnOnAccel", 
				label: "Turn on Acceleration"
			},
			{
				cmd: "turnOnLux", 
				label: "Turn on Lux"
			},
			{
				cmd: "turnOnMotion", 
				label: "Turn on Motion"
			},
			{
				cmd: "turnOffTemp", 
				label: "Turn off Temperature"
			},
			{
				cmd: "turnOffAccel", 
				label: "Turn off Acceleration"
			},
			{
				cmd: "turnOffLux", 
				label: "Turn off Lux"
			},
			{
				cmd: "turnOffMotion",
				label: "Turn off Motion"
			}
		];
	}
	
	static type() {
		return 'CC2650SensorTag';
	}
}	

module.exports = SensorTag2650;
