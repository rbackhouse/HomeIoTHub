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

var http = require('http');
var fs = require('fs');
var connect = require('connect');
var serveStatic = require('serve-static');
var HttpHandler = require("./HttpHandler");
var ClusterManager = require("./ClusterManager");
var RED = require("node-red");

var resourcedir = fs.realpathSync(__dirname+"/../resources");
var nodereddir = fs.realpathSync(__dirname+"/../nodered");
var noderedpubdir = fs.realpathSync(__dirname+"/../node_modules/node-red/public");

var httpHandler = new HttpHandler();
var app = connect()
	.use("/iot", httpHandler);
//	.use("/admin", serveStatic(resourcedir));

var server = http.createServer(app).listen(8080);

var settings = {
    httpAdminRoot: "/red",
    httpNodeRoot: "/api",
    userDir: nodereddir,
    functionGlobalContext: {}
};

RED.init(server,settings);
app.use(settings.httpAdminRoot,RED.httpAdmin);
app.use(settings.httpNodeRoot,RED.httpNode);
app.use("/", serveStatic(noderedpubdir));
RED.start();

//httpHandler.startWebSocketServer(server);
