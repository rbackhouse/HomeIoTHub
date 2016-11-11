define([
	'jquery', 
	'backbone', 
	'underscore',
	'jquerymobile',
	'views/DeviceView',
	'views/DevicesView',
	'views/ClusterView'
	], 
function($, Backbone, _, mobile, DeviceView, DevicesView, ClusterView) {
	var opts = Object.prototype.toString;
	function isArray(it) { return opts.call(it) === "[object Array]"; }
	
	var devices = [];
	var nodes = [];
	
	var ws;
	var url = 'ws://' + window.location.host+window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))+"/";
	if (window.WebSocket) {
		ws = new WebSocket(url);
	} else if (window.MozWebSocket) {
		ws = new MozWebSocket(url);
	} else {
		alert("No WebSocket Support !!!");
	}
	
	ws.onopen = function(event) {
		console.log('WebSocket opened');
	};
	ws.onmessage = function(event) {
		console.log(event.data);
		var msg = JSON.parse(event.data);
		
		switch (msg.type) {
			case "onstart":
				devices = msg.devices;
				nodes = msg.nodes;
				if (currentPage && currentPage.updateAll) {
					currentPage.updateAll(msg);
				}
				break;
			case "connected":
			case "read":
			case "disconnect":
				devices.forEach(function(device) {
					if (device.id == msg.id) {
						device = msg;
					}
				});
				if (currentPage && currentPage.update) {
					currentPage.update(msg);
				}
				break;
			case "discover":
				devices[msg.id] = msg;
				if (currentPage && currentPage.add) {
					currentPage.add(msg);
				}
				break;
			case "nodeAdded":
				nodes.push(msg.node);
				if (currentPage && currentPage.nodeAdded) {
					currentPage.nodeAdded(msg.node);
				}
				break;
			case "nodeRemoved":
				nodes = nodes.filter(function(node) {
					return node.hostname !== msg.node.hostname;
				});
				if (currentPage && currentPage.nodeRemoved) {
					currentPage.nodeRemoved(msg.node);
				}
				devices = devices.filter(function(device) {
					return msg.node.ids.indexOf(device.id) === -1;
				});
				if (currentPage && currentPage.updateAll) {
					currentPage.updateAll({devices: devices});
				}
				break;
		}
	};
	ws.onerror = function (error) {
		console.log('WebSocket Error ' + error);
		ws.close();
	};

	var currentPage;
	
	var Router = Backbone.Router.extend({
		initialize: function(options) {
			$('.back').on('click', function(event) {
	            window.history.back();
	            return false;
	        });
	        this.on("route:device", function(id) {
	        	var deviceNotFound = true;
	        	devices.forEach(function(device) {
	        		if (device.id === id) {
						this.changePage(new DeviceView({device: device}));
						deviceNotFound = false;
					}
	        	}.bind(this));
	        	if (deviceNotFound) {
					this.changePage(new DeviceView({device: {id: id}}));
	        	}
	        });
	        this.on("route:devices", function() {
				this.changePage(new DevicesView({devices: devices}));
	        });
	        this.on("route:cluster", function() {
				this.changePage(new ClusterView({nodes: nodes}));
	        });
			Backbone.history.start();
		},
	    changePage:function (page) {
	    	if (currentPage && currentPage.cleanup) {
	    		currentPage.cleanup();
	    	}
	    	currentPage = page;
	        $(page.el).attr('data-role', 'page');
	        page.render();
	        $('body').append($(page.el));
	        mobile.changePage($(page.el), {changeHash:false, reverse: false});
	    },
		routes: {
			'device/:id': 'device',
			'devices': 'devices',
			'cluster': 'cluster',
			'': 'devices'
		}
	});
	
	return Router;
});
