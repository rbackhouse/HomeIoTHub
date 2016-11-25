module.exports = function(RED) {
	function BLEDevice(config) {
		var BLEManager = require("../../lib/BLEManager");
		
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.uuid = config.uuid;
        var node = this;
        
		var devices = BLEManager.getDevices();
		var	device = devices[node.uuid];
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
			if (device.isConnected()) {
				node.log(device.name+":"+device.id+" is connected. sending cmd : "+msg.payload.cmd);
				BLEManager.sendCommand(device.id, msg.payload.cmd, function() {});
			} else {	
				node.log(device.name+":"+device.id+" is not connected. saving cmd : "+msg.payload.cmd+" for when connected");
				cmds.push(msg.payload.cmd);
				BLEManager.connectToDevice(device.id);
			}
        });
        this.on('close', function() {
        	if (device) {
        		BLEManager.disconnectFromDevice(device.id);
        	}
        });
    }	
	RED.nodes.registerType("BLEDevice", BLEDevice);
}