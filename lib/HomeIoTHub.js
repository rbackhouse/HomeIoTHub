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

const http = require('http');
const fs = require('fs');
const connect = require('connect');
const serveStatic = require('serve-static');
const HttpHandler = require("./HttpHandler");
const ClusterManager = require("./ClusterManager");
const RED = require("node-red");
const BLEManager = require("./BLEManager");

const resourcedir = fs.realpathSync(__dirname+"/../resources");
const nodereddir = fs.realpathSync(__dirname+"/../nodered");
const noderedpubdir = fs.realpathSync(__dirname+"/../node_modules/node-red/public");
const deviceids = process.argv.length > 2 ? Array.from(process.argv[2].split(",")) : [];

if (deviceids.length > 0) {
	BLEManager.setDeviceIds(deviceids);
}

const httpHandler = new HttpHandler();
const app = connect()
	.use("/iot", httpHandler);
//	.use("/admin", serveStatic(resourcedir));

const server = http.createServer(app).listen(8080);

const settings = {
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
