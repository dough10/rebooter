# reboot

reboot a router if internet is down.

This is app pings internet URL's and IP addresses. When all pings fail it will trip a relay for 35 seconds allowing a router to be restarted.

Manual reboot from web frontend requires login. The app is also configured to allow for two factor authentication so if you do decide to expose it to the internet you can feel a little safer knowing any random person that finds the frontend can NOT reboot your router.

This app requires sudo permission in order to have access to Raspberry Pi's GPIOs. With that being said I do not recommend exposing this app to the internet and should only be used for internal use.

clone the repo
```shell
git clone https://github.com/dough10/rebooter
```
install node modules
```shell
cd rebooter && npm install
```

configure the JSON file to your liking

I recommend at least changing the "haskKey" property if you change nothing else

The "maxping" property is the high ping threshold. If more then half of the addresses return high ping app will call for a router reboot.

The "repeat" property is how long between pings in hours. Default is 15 min or .25 hours

The "relayPin" property is the Number of the GPIO pin you have connected to your relay.  **GPIO number not ping number**

The 'graphLength' property is how many data points will be displayed on graphs

You should not add any local IP address to the addresses array. If you do it will not reboot you router correctly.  **internet addresses only**


```shell
nano config.json
```

create a user **follow the prompts for input**

If a user is added while app is running you will have to restart app for new user to be able to login

if you select to use two factor authentication you will need one of the apps below on a mobile device and scan the generated QR code saved as "install directory/username.png" or used the generated text key saved as "install directory/username.txt"

* Authy [iPhone](https://itunes.apple.com/us/app/authy/id494168017?mt=8) | [Android](https://play.google.com/store/apps/details?id=com.authy.authy&hl=en) | [Chrome](https://chrome.google.com/webstore/detail/authy/gaedmjdfmmahhbjefcbgaolhhanlaolb?hl=en) | [Linux](https://www.authy.com/personal/) | [OS X](https://www.authy.com/personal/) | [BlackBerry](https://appworld.blackberry.com/webstore/content/38831914/?countrycode=US&lang=en)
* Google Authenticator [iPhone](https://itunes.apple.com/us/app/google-authenticator/id388497605?mt=8) | [Android](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en)
* Microsoft Authenticator [Windows Phone](https://www.microsoft.com/en-us/store/apps/authenticator/9wzdncrfj3rj) | [Android](https://play.google.com/store/apps/details?id=com.microsoft.msa.authenticator)
* GAuth [FxOS](https://marketplace.firefox.com/app/gauth/)

```shell
node createUser
```

run the app
```shell
sudo node rebooter
```

the web frontend is hosted on port 8080
