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
		'text!templates/cluster.html'], 
function($, Backbone, _, BaseView, template){
	var View = BaseView.extend({
		events: function() {
		    return _.extend({}, BaseView.prototype.events, {
		    });	
		},
		initialize: function(options) {
			options.header = {
				title: "Cluster"
			};
			this.nodes = options.nodes;
			this.constructor.__super__.initialize.apply(this, [options]);
			this.template = _.template( template ) ( { nodes: this.nodes } );
		},
		render: function(){
			$(this.el).html( this.headerTemplate + this.template + this.menuTemplate );
		},
		nodeAdded: function(node) {
			this.nodes.push(node);
			this._refreshList();
		},
		nodeRemoved: function(removed) {
			this.nodes = this.nodes.filter(function(node) {
				return node.hostname !== removed.hostname;
			});
			this._refreshList();
		},
		updateAll: function(msg) {
			this.nodes = msg.nodes;
			this._refreshList();
		},
		_refreshList: function() {
			$("#nodelist li").remove();
			this.nodes.forEach(function(node) {
				$("#nodelist").append('<li data-icon="arrow-r"><p style="white-space:normal">'+ node.hostname+'</p></li>');
			});
			$("#nodelist").listview('refresh');
		}
	});
	
	return View;
});
