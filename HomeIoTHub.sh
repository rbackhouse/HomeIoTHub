#! /bin/sh

case "$1" in
   	start)
    	echo "Starting HomeIoTHub"
    	/usr/bin/node /home/pi/HomeIoTHub/lib/HomeIoTHub.js >> /home/pi/HomeIoTHub.log
   		;;
   	stop)
    	echo "Stopping HomeIoTHub"
    	killall -9 node
    	;;
  	*)
		echo "Usage: /etc/init.d/HomeIoTHub {start|stop}"
		exit 1
    	;;
esac

exit 0