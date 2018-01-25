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

const BLEDevice = require('../lib/BLEDevice');

const SIMPLE_KEY_UUID                         = 'ffe0';
const SIMPLE_KEY_DATA_UUID                    = 'ffe1';

const IR_TEMPERATURE_UUID                     = 'f000aa0004514000b000000000000000';
const IR_TEMPERATURE_CONFIG_UUID              = 'f000aa0204514000b000000000000000';
const IR_TEMPERATURE_DATA_UUID                = 'f000aa0104514000b000000000000000';
const IR_TEMPERATURE_PERIOD_UUID              = 'f000aa0304514000b000000000000000';

const HUMIDITY_UUID                           = 'f000aa2004514000b000000000000000';
const HUMIDITY_CONFIG_UUID                    = 'f000aa2204514000b000000000000000';
const HUMIDITY_DATA_UUID                      = 'f000aa2104514000b000000000000000';
const HUMIDITY_PERIOD_UUID                    = 'f000aa2304514000b000000000000000';

const BAROMETRIC_PRESSURE_UUID                = 'f000aa4004514000b000000000000000';
const BAROMETRIC_PRESSURE_CONFIG_UUID         = 'f000aa4204514000b000000000000000';
const BAROMETRIC_PRESSURE_DATA_UUID           = 'f000aa4104514000b000000000000000';
const BAROMETRIC_PRESSURE_PERIOD_UUID         = 'f000aa4404514000b000000000000000';

const MPU9250_UUID                            = 'f000aa8004514000b000000000000000';
const MPU9250_CONFIG_UUID                     = 'f000aa8204514000b000000000000000';
const MPU9250_DATA_UUID                       = 'f000aa8104514000b000000000000000';
const MPU9250_PERIOD_UUID                     = 'f000aa8304514000b000000000000000';

const IO_UUID                                 = 'f000aa6404514000b000000000000000';
const IO_DATA_UUID                            = 'f000aa6504514000b000000000000000';
const IO_CONFIG_UUID                          = 'f000aa6604514000b000000000000000';

const LUXOMETER_UUID                          = 'f000aa7004514000b000000000000000';
const LUXOMETER_CONFIG_UUID                   = 'f000aa7204514000b000000000000000';
const LUXOMETER_DATA_UUID                     = 'f000aa7104514000b000000000000000';
const LUXOMETER_PERIOD_UUID                   = 'f000aa7304514000b000000000000000';

const MPU9250_GYROSCOPE_MASK                  = 0x0007;
const MPU9250_ACCELEROMETER_MASK              = 0x0238;
const MPU9250_MAGNETOMETER_MASK               = 0x0040;

const on = [0x01];
const off = [0x00];

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
			//[IR_TEMPERATURE_DATA_UUID, MPU9250_DATA_UUID, LUXOMETER_DATA_UUID]
			[]
		);  
		this.on("data", (uuid, data) => {
			console.log("SensorTag2650 data : "+BLEDevice.arrayToStr(data));
			this._onRead(uuid, data);
		});
	}

	static is(peripheral) {
		return (peripheral.advertisement.localName === 'CC2650 SensorTag');
	}

	_onRead(uuid, data) {
		switch(uuid) {
			case IR_TEMPERATURE_DATA_UUID: 
				let ambientTemperature = data.readInt16LE(2) / 128.0;
				let objectTemperature = data.readInt16LE(0) / 128.0;		
				this.emit('read', "irtemp", {ambientTemperature: ambientTemperature, objectTemperature: objectTemperature});
				break;
			case MPU9250_DATA_UUID: 
				let xG = data.readInt16LE(0) / 128.0;
				let yG = data.readInt16LE(2) / 128.0;
				let zG = data.readInt16LE(4) / 128.0;
				let x = data.readInt16LE(6) / 4096.0;
				let y = data.readInt16LE(8) / 4096.0;
				let z = data.readInt16LE(10) / 4096.0;
				let xM = data.readInt16LE(12) * 4912.0 / 32768.0;
				let yM = data.readInt16LE(14) * 4912.0 / 32768.0;
				let zM = data.readInt16LE(16) * 4912.0 / 32768.0;
				this.emit('read', "accel", {x: x, y: y, z: z, xG: xG, yG: yG, zG: zG, xM: xM, yM: yM, zM: zM});
				break;
			case LUXOMETER_DATA_UUID:
				let rawLux = data.readUInt16LE(0);
				let exponent = (rawLux & 0xF000) >> 12;
				let mantissa = (rawLux & 0x0FFF);
				let flLux = mantissa * Math.pow(2, exponent) / 100.0;		
				this.emit('read', "lux", {flLux: flLux});
				break;
		}
	}

	turnOnTemp(done) {
		this.write(IR_TEMPERATURE_CONFIG_UUID, new Buffer(new Uint8Array(on)), true, () => {
			this.write(IR_TEMPERATURE_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		});
	}

	turnOffTemp(done) {
		this.write(IR_TEMPERATURE_CONFIG_UUID, new Buffer(new Uint8Array(off)), true, done);
	}

	turnOnAccel(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0x7f, 0x00])), true, () => {
			this.write(MPU9250_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		});
	}

	turnOffAccel(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0x00, 0x00])), true, done);
	}

	turnOnLux(done) {
		this.write(LUXOMETER_CONFIG_UUID, new Buffer(new Uint8Array(on)), true, () => {
			this.write(LUXOMETER_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		});
	}

	turnOffLux(done) {
		this.write(LUXOMETER_CONFIG_UUID, new Buffer(new Uint8Array(off)), true, done);
	}

	turnOnMotion(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0xff, 0x00])), true, () => {
			this.write(MPU9250_PERIOD_UUID, new Buffer(new Uint8Array([0xff])), true, done);
		});
	}

	turnOffMotion(done) {
		this.write(MPU9250_CONFIG_UUID, new Buffer(new Uint8Array([0x00, 0x00])), true, done);
	}
	
	readTemp(done) {
		this.write(IR_TEMPERATURE_CONFIG_UUID, new Buffer(new Uint8Array(on)), true, () => {
			this.read(IR_TEMPERATURE_DATA_UUID, (err, data) => {
				this._onRead(IR_TEMPERATURE_DATA_UUID, data);
			});
		});
	}

	static commands() {
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
			},
			{
				cmd: "readTemp",
				readType: "irtemp",
				label: "Read Temperature"
			}
		];
	}
	
	static type() {
		return 'CC2650SensorTag';
	}
}	

module.exports = SensorTag2650;
