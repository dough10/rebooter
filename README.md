# Rebooter.js

Reboot a router if internet is down with Raspberry Pi, Node.JS and a relay.

Rebooter pings internet URL's and IP addresses. When all pings fail it will if configured attempt to reboot the router by ssh connection and fallback to tripping a relay for 35 seconds interupting power to the router.

Manual reboot from web frontend requires login. The app is also configured to allow for two factor authentication so if you do decide to expose it to the internet you can feel a little safer knowing any random person that finds the frontend can NOT reboot your router.

Rebooter requires sudo permission in order to have access to Raspberry Pi's GPIOs. With that being said I do not recommend exposing Rebooter to the internet and should only be used for internal use.

## dependencies
    "authenticator": "^1.1.2",
    "bcrypt": "^0.8.6",
    "compression": "^1.6.1",
    "express": "^4.13.4",
    "jsonwebtoken": "^6.2.0",
    "nedb": "^1.8.0",
    "network": "^0.1.3",
    "ping-wrapper": "0.0.3",
    "prompt": "^1.0.0",
    "qr-image": "^3.1.0",
    "simple-ssh": "^0.9.0",
    "socket.io": "^1.4.5"

## dev dependencies
    "babel-plugin-transform-es2015-arrow-functions": "^6.5.2",
    "babel-plugin-transform-es2015-block-scoping": "^6.7.1",
    "babel-plugin-transform-es2015-classes": "^6.7.7",
    "grunt": "^1.0.1",
    "grunt-babel": "^6.0.0",
    "grunt-contrib-cssmin": "^1.0.1",
    "grunt-contrib-htmlmin": "^1.3.0",
    "grunt-contrib-uglify": "^1.0.1",
    "grunt-processhtml": "^0.3.13"


## install instructions
install node js v4.0.0 or higher  * I followed the instruction [here](https://blog.wia.io/installing-node-js-v4-0-0-on-a-raspberry-pi) *


I also needed to update gcc & g++ to 4.8 in order to install some modules
```shell
sudo apt-get update
sudo apt-get install gcc-4.8 g++-4.8
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.6 20
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.8 50
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-4.6 20
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-4.8 50
```

clone the repo
```shell
git clone https://github.com/dough10/rebooter
```
install node modules
```shell
cd rebooter && npm install
```
configure the JSON file to your liking
```shell
nano config.json
```

I recommend at least changing the "hashKey" property if you change nothing else

The "maxping" property is the high ping threshold. If more then half of the addresses return high ping app will call for a router reboot.

The "repeat" property is how long between pings in hours. Default is 15 min or 0.25 hours

The "relayPin" property is the Number of the GPIO pin you have connected to your relay.  **GPIO number not pin number**

The 'graphLength' property is how many data points will be displayed on graphs

You should not add any local IP address to the addresses array. If you do it will not reboot you router correctly. add internet addresses only.


create a user
```shell
node createUser
```

If a user is added while app is running you will have to restart app for new user to be able to login

If you select 'true' to use two factor authentication you will need one of the apps below and to scan the generated QR code saved as "install directory/username.png" or used the generated text key saved as "install directory/username.txt"

* Authy [iPhone](https://itunes.apple.com/us/app/authy/id494168017?mt=8) | [Android](https://play.google.com/store/apps/details?id=com.authy.authy&hl=en) | [Chrome](https://chrome.google.com/webstore/detail/authy/gaedmjdfmmahhbjefcbgaolhhanlaolb?hl=en) | [Linux](https://www.authy.com/personal/) | [OS X](https://www.authy.com/personal/) | [BlackBerry](https://appworld.blackberry.com/webstore/content/38831914/?countrycode=US&lang=en)
* Google Authenticator [iPhone](https://itunes.apple.com/us/app/google-authenticator/id388497605?mt=8) | [Android](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en)
* Microsoft Authenticator [Windows Phone](https://www.microsoft.com/en-us/store/apps/authenticator/9wzdncrfj3rj) | [Android](https://play.google.com/store/apps/details?id=com.microsoft.msa.authenticator)
* GAuth [FxOS](https://marketplace.firefox.com/app/gauth/)


If your router supports it and an you have ssh.json file configured you can attempt to reboot with ssh before triggering the relay
```shell
nano ssh.json
```

ssh.json example
```json
{
  "user":"admin",
  "pass":"password"
}
```
If you need to force Rebooter to ssh a IP differant then the detected address you can add a "host" property with that IP to the ssh.json object


run the app
```shell
sudo node rebooter
```

the web frontend is hosted on port 8080



## Setup autoload on boot with Forever and crontab

install forever
```shell
sudo npm install -g forever
```


edit crontab
```shell
crontab -e
```

edit the following command to match your folder structure and paste at the bottom of the crontab file.
```shell
@reboot /usr/bin/sudo -u root -H /usr/local/bin/forever start /home/pi/rebooter/rebooter.js
```


## dev

Grunt required for build process
```shell
sudo npm install -g grunt
```

html sourve file = /html/src.html

css source  = /html/css/bace.css

js source = /html/js/rebooter-client.es6

if any changes are made to those files you must run "grunt" from project root
