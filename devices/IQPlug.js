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

var SERVICE_UUID = 'fff0';
var CHAR_UUID = 'fff3';
var NOTIFY_UUID = 'fff4';

var on = [0x0F, 0x06, 0x03, 0x00, 0x01, 0x00, 0x00, 0x05, 0xFF, 0xFF];
var off = [0x0F, 0x06, 0x03, 0x00, 0x00, 0x00, 0x00, 0x04, 0xFF, 0xFF];
var cmd1 = [0x0f, 0x05, 0x04, 0x00, 0x00, 0x00, 0x05, 0xff, 0xff];
var cmd2 = [0x0f, 0x05, 0x10, 0x00, 0x00, 0x00, 0x11, 0xff, 0xff];

class IQPlug extends BLEDevice {
	constructor(peripheral) {
		super(peripheral, [SERVICE_UUID], [CHAR_UUID, NOTIFY_UUID], [NOTIFY_UUID]);  
		this.on("data", function(uuid, data) {
			this._onRead(uuid, data);
		}.bind(this));
	}
	
	static is(peripheral) {
		return (peripheral.advertisement.localName === 'SATECHIPLUG');
	}

	_onRead(uuid, data) {
		var b1 = data[8];
		var b2 = data[9];
		this.emit('read', "iqplug", {watts: b1+"."+b2});
	}

	turnOn(done) {
		this.write(CHAR_UUID, new Buffer(new Uint8Array(on)), true, done);
	}

	turnOff(done) {
		this.write(CHAR_UUID, new Buffer(new Uint8Array(off)), true, done);
	}

	cmd1(done) {
		this.write(CHAR_UUID, new Buffer(new Uint8Array(cmd1)), true, done);
	}

	cmd2(done) {
		this.write(CHAR_UUID, new Buffer(new Uint8Array(cmd2)), true, done);
	}

	commands() {
		return [
			{
				cmd: "turnOn",
				label: "Turn On"
			},
			{
				cmd: "turnOff",
				label: "Turn Off"
			},
			{
				cmd: "cmd1",
				label: "Test Cmd 1"
			},
			{
				cmd: "cmd2",
				label: "Test Cmd 2"
			}
		];
	}
	
	static type() {
		return 'SATECHIPLUG';
	}
}

module.exports = IQPlug;
