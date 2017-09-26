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
module.exports = function(RED) {
	function BLEDevice(config) {
		var BLEManager = require("../../lib/BLEManager");
		
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.uuid = config.uuid;
        var node = this;

		BLEManager.waitFor(node.uuid, function(device) {
	        node.log(node.name+":"+node.uuid+" created");
			var cmds = [];
			device.on("connected", function() {
				node.log(device.name+":"+device.id+" connected");
				node.status({fill:"red",shape:"ring",text:"connected"});
				cmds.forEach(function(cmd) {
					node.log("sending cmd : "+cmd+" to "+device.name+":"+device.id);
					BLEManager.sendCommand(device.id, cmd, function() {});
				});
				cmds = [];
			});
			device.on("disconnected", function() {
				node.log(device.name+":"+device.id+" disconnected");
				node.status({fill:"red",shape:"dot",text:"disconnected"});
			});
			device.on("read", function(type, data) {
				node.log("read type : "+type+" data : "+JSON.stringify(data)+" from "+device.name+":"+device.id);
				var readMsg = {
					id: device.id,
					name: device.name,
					type: type,
					data: data
				};
				node.send({payload: readMsg});
			});
			this.on('input', function(msg) {
				node.log("input with msg : "+JSON.stringify(msg)+" on "+device.name+":"+device.id);
				cmds.push(msg.payload.cmd);
				BLEManager.connectToDevice(device.id);
			});
			this.on('close', function() {
				node.log(node.name+":"+node.uuid+" closed");
				if (device) {
					BLEManager.disconnectFromDevice(device.id);
				}
			});
		}.bind(this));	
    }	
	RED.nodes.registerType("BLEDevice", BLEDevice);
}