const bcrypt = require('bcryptjs');
const config = require(__dirname + '/config.json');
const Datastore = require('nedb');
const prompt = require('prompt');
const authenticator = require('authenticator');
const qr = require('qr-image');
const fs = require('fs');
const mongoose = require('mongoose');

prompt.start();

const usersSchema = mongoose.Schema({
  username: String,
  password: String,
  authKey: String,
  twoFactor: Boolean
});

const users = mongoose.model('users', usersSchema);
users.insert = function (data, cb) {
  const insert = new users(data);
  insert.save(data, cb);
};


var things = {
  properties: {
    username: {
      description: 'username',
      type: 'String',
      patern: /^.{4,32}$/,
      required: true
    },
    password: {
      description: 'password',
      type: 'String',
      patern: /^.{6,24}$/,
      required: true
    },
    twoFactor: {
      description: 'use two factor authentication?',
      type: 'Boolean',
      required: true
    }
  }
};

const mongodb = mongoose.connection;

mongodb.on('error', console.error);
mongodb.once('open', _ => {
  prompt.get(things, (err, input) => {
    if (err) {
      console.log('Error');
    } else {
      var salt = bcrypt.genSaltSync(config.encryptionIterations);
      var deets = {
        username: input.username.toLowerCase(),
        password: bcrypt.hashSync(input.password, salt),
        authKey: authenticator.generateKey(),
        twoFactor: input.twoFactor
      };
      users.count({
        username: deets.name
      }, (err, count) => {
        if (count !== 0) {
          console.log('user exists');
          return;
        }
        users.insert(deets, err => {
          if (err) {
            console.log('error creating user');
            return;
          }
          users.findOne({
            username:deets.username
          }, (err, thing) => {
            if (!thing) {
              console.log('error creating user');
            }
            if (deets.twoFactor) {
              var png = qr.image(authenticator.generateTotpUri(deets.authKey, deets.username, 'Rebooter.js', 'SHA1', 6, 30), {
                type: 'png'
              });
              png.pipe(fs.createWriteStream(deets.username + '.png'));
            }
            fs.writeFile(deets.username + '.txt', deets.authKey);
            console.log('User '+ deets.username + ' Created with a password of ' + input.password);
          });
        });
      });
    }
  });
});
const dbConfig = require(__dirname + '/mongoose.json');
mongoose.connect('mongodb://' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.db);
