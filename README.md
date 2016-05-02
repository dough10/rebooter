# reboot

reboot a router if internet is down.

This app requires sudo permission in order to have access to Raspberry Pi's GPIOs. With that being said i do not recomend exposing this app to the internet and should only be used for internal use.

clone the repo
```shell
git clone https://github.com/dough10/rebooter
```
install node modules
```shell
cd rebooter && npm install
```
run the app
```shell
sudo node rebooter
```