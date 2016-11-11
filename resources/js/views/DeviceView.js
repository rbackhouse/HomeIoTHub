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
define([
		'jquery', 
		'backbone',
		'underscore',
		'./BaseView',
		'text!templates/device.html'], 
function($, Backbone, _, BaseView, template){
	var View = BaseView.extend({
		events: function() {
		    return _.extend({}, BaseView.prototype.events, {
				"click #connect" : function(evt) {
					if (this.isConnected) {
						this.disconnect();
					} else {
						this.connect();
					}
				},
				"click #cmdlist li" : function(evt) {
					var id = evt.target.id;
					if (id === "") {
						id = evt.target.parentNode.id;
					}
					if (id !== "") {
						$.ajax({
							url: "./iot/"+this.device.id+"/"+id,
							type: "POST",
							headers: { "cache-control": "no-cache" },
							contentTypeString: "application/x-www-form-urlencoded; charset=utf-8",
							dataType: "text",
							success: function(data, textStatus, jqXHR) {},
							error: function(jqXHR, textStatus, errorThrown) {}
						});
					}
				}
		    });	
		},
		initialize: function(options) {
			options.header = {
				title: "Device"
			};
			this.device = options.device;
			this.constructor.__super__.initialize.apply(this, [options]);
			this.template = _.template( template ) ( {device: this.device } );
			this.isConnected = false;
		},
		render: function(){
			$(this.el).html( this.headerTemplate + this.template + this.menuTemplate );
		},
		updateAll: function(devices) {
			devices.forEach(function(device) {
				if (device.id === this.device.id) {
					this.device = device;
					$("#nameid").val(device.name+" : "+device.id);
					device.commands.forEach(function(cmd) {
						$("#cmdlist").append('<li data-icon="arrow-r"><a id="'+cmd.cmd+'"><p style="white-space:normal">'+cmd.label+'</p></a></li>');
					});
					$("#cmdlist").listview('refresh');
				}
			}.bind(this));
		},
		update: function(msg) {
			if (msg.id = this.device.id) {
				var dataStr = msg.type+":\n"+JSON.stringify(msg.data);
				$("#data").val(dataStr);
			}
		},
		connect: function() {
			$.ajax({
				url: "./iot/"+this.device.id+"/connect",
				type: "POST",
				headers: { "cache-control": "no-cache" },
				contentTypeString: "application/x-www-form-urlencoded; charset=utf-8",
				dataType: "text",
				success: function(data, textStatus, jqXHR) {
					this.isConnected = true;
					$("#connect").val('Disconnect');
					$("#connect").button("refresh");
				}.bind(this),
				error: function(jqXHR, textStatus, errorThrown) {}
			});
		},
		disconnect: function() {
			$.ajax({
				url: "./iot/"+this.device.id+"/disconnect",
				type: "POST",
				headers: { "cache-control": "no-cache" },
				contentTypeString: "application/x-www-form-urlencoded; charset=utf-8",
				dataType: "text",
				success: function(data, textStatus, jqXHR) {
					this.isConnected = false;
					$("#connect").val('Connect');
					$("#connect").button("refresh");
				}.bind(this),
				error: function(jqXHR, textStatus, errorThrown) {}
			});
		}				
	});
	
	return View;
});
