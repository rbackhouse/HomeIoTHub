### HomeIoTHub
A node.js based Clustered IoT Hub geared toward home use. 

* Searches for Bluetooth LE devices that have plugins registered.
* Cluster Nodes provide a single view of all devices found in the home.
* Embedded node-red used for UI

#### Usage

First run this once to enable non-root access to the devices

```
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

Then to use this to start the Hub

```
node lib/HomeIoTHub.js
```

#### node-red access

Point a browser at any of the nodes via http://[hostname]:8080/red
