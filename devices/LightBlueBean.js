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
var crc = require('crc');
                    
var SERIAL_UUID = 'a495ff10c5b14b44b5121370f02d74de';
var BEAN_SERIAL_CHAR_UUID = 'a495ff11c5b14b44b5121370f02d74de';

var commands = {
    MSG_ID_SERIAL_DATA        : new Buffer([0x00, 0x00]),
    MSG_ID_BT_SET_ADV         : new Buffer([0x05, 0x00]),
    MSG_ID_BT_SET_CONN        : new Buffer([0x05, 0x02]),
    MSG_ID_BT_SET_LOCAL_NAME  : new Buffer([0x05, 0x04]),
    MSG_ID_BT_SET_PIN         : new Buffer([0x05, 0x06]),
    MSG_ID_BT_SET_TX_PWR      : new Buffer([0x05, 0x08]),
    MSG_ID_BT_GET_CONFIG      : new Buffer([0x05, 0x10]),
    MSG_ID_BT_ADV_ONOFF       : new Buffer([0x05, 0x12]),
    MSG_ID_BT_SET_SCRATCH     : new Buffer([0x05, 0x14]),
    MSG_ID_BT_GET_SCRATCH     : new Buffer([0x05, 0x15]),
    MSG_ID_BT_RESTART         : new Buffer([0x05, 0x20]),
    MSG_ID_GATING             : new Buffer([0x05, 0x50]),
    MSG_ID_BL_CMD             : new Buffer([0x10, 0x00]),
    MSG_ID_BL_FW_BLOCK        : new Buffer([0x10, 0x01]),
    MSG_ID_BL_STATUS          : new Buffer([0x10, 0x02]),
    MSG_ID_CC_LED_WRITE       : new Buffer([0x20, 0x00]),
    MSG_ID_CC_LED_WRITE_ALL   : new Buffer([0x20, 0x01]),
    MSG_ID_CC_LED_READ_ALL    : new Buffer([0x20, 0x02]),
    MSG_ID_CC_ACCEL_READ      : new Buffer([0x20, 0x10]),
    MSG_ID_CC_TEMP_READ       : new Buffer([0x20, 0x11]),
    MSG_ID_AR_SET_POWER       : new Buffer([0x30, 0x00]),
    MSG_ID_AR_GET_CONFIG      : new Buffer([0x30, 0x06]),
    MSG_ID_DB_LOOPBACK        : new Buffer([0xFE, 0x00]),
    MSG_ID_DB_COUNTER         : new Buffer([0xFE, 0x01]),
};

var numSamples = 10;
var insensitivity = 2;

class Bean extends BLEDevice {
	constructor(peripheral) {
		super(peripheral, [SERIAL_UUID], [BEAN_SERIAL_CHAR_UUID], [BEAN_SERIAL_CHAR_UUID]);  
		this.count = 0;
		this.gst = new Buffer(0);
	
		this.on("data", function(uuid, data) {
			this._onRead(data);
		}.bind(this));
	}

	static is(peripheral) {
		return (peripheral.advertisement.localName === 'Bean');
	}

	_onRead(gt) {
		var start = (gt[0] & 0x80);
		var messageCount = (gt[0] & 0x60);
		var packetCount = (gt[0] & 0x1F);

		if (start) {
			this.gst = new Buffer(0);
		}

		this.gst = Buffer.concat( [this.gst, gt.slice(1)] );

		if (packetCount === 0) {
			var length = this.gst[0];

			var crcString = crc.crc16ccitt(this.gst.slice(0,this.gst.length-2));
			var crc16 = new Buffer(crcString, 'hex');
			var valid = (crc16[0]===this.gst[this.gst.length-1] && crc16[1]===this.gst[this.gst.length-2]);

			var command = ( (this.gst[2] << 8) + this.gst[3] ) & ~(0x80) ;

			this.emit('raw', this.gst.slice(2,this.gst.length-2), length, valid, command);

			if (valid) {
				if (command === (commands.MSG_ID_CC_ACCEL_READ[0] << 8 ) + commands.MSG_ID_CC_ACCEL_READ[1]) {
					var x = (((this.gst[5] << 24) >> 16) | this.gst[4]) * 0.00391;
					var y = (((this.gst[7] << 24) >> 16) | this.gst[6]) * 0.00391;
					var z = (((this.gst[9] << 24) >> 16) | this.gst[8]) * 0.00391;

					var avX = Math.abs(this.totalX / numSamples);
					var avY = Math.abs(this.totalY / numSamples);
					var avZ = Math.abs(this.totalZ / numSamples);

					this.totalX -= this.samplesX[this.index];
					this.totalY -= this.samplesY[this.index];
					this.totalZ -= this.samplesZ[this.index];
				
					this.samplesX[this.index] = x;
					this.samplesY[this.index] = y;
					this.samplesZ[this.index] = z;
				
					this.totalX += this.samplesX[this.index];
					this.totalY += this.samplesY[this.index];
					this.totalZ += this.samplesZ[this.index];			
	
					if (++this.index >= numSamples) {
						this.index = 0;
					}
				
					if ( Math.abs(Math.abs(this.totalX / numSamples) - avX) > insensitivity ) {
						this.emit('read', "movement", {axis:"x"});
					}
					if ( Math.abs(Math.abs(this.totalY / numSamples) - avY) > insensitivity ) {
						this.emit('read', "movement", {axis:"y"});
					}
					if ( Math.abs(Math.abs(this.totalZ / numSamples) - avZ) > insensitivity ) {
						this.emit('read', "movement", {axis:"z"});
					}
					
					this.emit('read', "accell", {x: x.toFixed(5), y: y.toFixed(5), z: z.toFixed(5)});

				} else if(this.gst[2] === commands.MSG_ID_SERIAL_DATA[0] && this.gst[3] === commands.MSG_ID_SERIAL_DATA[1]) {
					this.emit('serial', this.gst.slice(4,this.gst.length-2), valid);
				} else if(command === (commands.MSG_ID_CC_TEMP_READ[0] << 8 ) + commands.MSG_ID_CC_TEMP_READ[1]){
					this.emit('read', "temp",  {temp: this.gst[4]});
				} else {
					this.emit('invalid', this.gst.slice(2,this.gst.length-2), length, valid, command);
				}
			}
		}
	}

	send(cmdBuffer, payloadBuffer, done) {
		var sizeBuffer = new Buffer(2);
		sizeBuffer.writeUInt8(cmdBuffer.length + payloadBuffer.length,0);
		sizeBuffer.writeUInt8(0,1);

		var gstBuffer = Buffer.concat([sizeBuffer,cmdBuffer,payloadBuffer]);

		var crcString = crc.crc16ccitt(gstBuffer);
		var crc16Buffer = new Buffer(crcString, 'hex');

		var gattBuffer = new Buffer(1 + gstBuffer.length + crc16Buffer.length);

		var header = (((this.count++ * 0x20) | 0x80) & 0xff);
		gattBuffer[0]=header;

		gstBuffer.copy(gattBuffer,1,0);

		gattBuffer[gattBuffer.length-2]=crc16Buffer[1];
		gattBuffer[gattBuffer.length-1]=crc16Buffer[0];

		this.write(BEAN_SERIAL_CHAR_UUID, gattBuffer, true, done);
	}

	unGate(done) {
		this.send(commands.MSG_ID_GATING, new Buffer({}), done);
	}

	writeTo(data, done){
		this.send(commands.MSG_ID_SERIAL_DATA, data, done);
	}

	setColor(color,done) {
		this.send(commands.MSG_ID_CC_LED_WRITE_ALL, color, done);
	}

	requestAccel(done) {
		this.send(commands.MSG_ID_CC_ACCEL_READ, new Buffer([]), done);
	}

	requestTemp(done) {
		this.send(commands.MSG_ID_CC_TEMP_READ, new Buffer([]), done);
	};

	startMonitoring(done) {
		if (!this.intervalId) {
			this.samplesX = Array.apply(null, Array(numSamples)).map(function (x, i) { return 0; });
			this.samplesY = Array.apply(null, Array(numSamples)).map(function (x, i) { return 0; });
			this.samplesZ = Array.apply(null, Array(numSamples)).map(function (x, i) { return 0; });
			this.totalX = 0;
			this.totalY = 0;
			this.totalZ = 0;
			this.index = 0;
	
			this.intervalId = setInterval(function() {
				this.requestAccell(function() {});
				this.requestTemp(function() {});
			}.bind(this), 20000);
		}
		done();
	}

	stopMonitoring(done) {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
		done();
	}

	commands() {
		return [
			{
				cmd: "requestAccel",
				label: "Request Acceleration" 
			},
			{
				cmd: "requestTemp", 
				label: "Request Temperature" 
			},	
			{
				cmd: "startMonitoring", 
				label: "Start Monitoring" 
			},	
			{
				cmd: "stopMonitoring",
				label: "Stop Montioring" 
			}	
		];
	}
	
	static type() {
		return 'LightBlueBean';
	}
}

module.exports = Bean;