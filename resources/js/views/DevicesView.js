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
		'text!templates/devices.html'], 
function($, Backbone, _, BaseView, template){
	var View = BaseView.extend({
		events: function() {
		    return _.extend({}, BaseView.prototype.events, {
		    });	
		},
		initialize: function(options) {
			options.header = {
				title: "Devices"
			};
			this.devices = options.devices;
			this.constructor.__super__.initialize.apply(this, [options]);
			this.template = _.template( template ) ( { devices: this.devices } );
		},
		render: function(){
			$(this.el).html( this.headerTemplate + this.template + this.menuTemplate );
		},
		updateAll: function(msg) {
			this.devices = msg.devices;
			this._refreshList();
		},
		update: function(updated) {
			this.devices.forEach(function(device) {
				if (device.id === updated.id) {
					device = updated;
				}
			});
			this._refreshList();
		},
		add: function(device) {	
			$("#devicelist").append('<li data-icon="arrow-r"><a href="#device/'+ device.id +'"><p style="white-space:normal">'+ device.name +' ['+device.id + '] '+device.rssi+' '+device.hostname+'</p></a></li>');
			$("#devicelist").listview('refresh');
		},
		_refreshList: function() {
			$("#devicelist li").remove();
			this.devices.forEach(function(device) {
				$("#devicelist").append('<li data-icon="arrow-r"><a href="#device/'+ device.id +'"><p style="white-space:normal">'+ device.name +' ['+device.id + '] '+device.rssi+' '+device.hostname+'</p></a></li>');
			});
			$("#devicelist").listview('refresh');
		}
	});
	
	return View;
});
