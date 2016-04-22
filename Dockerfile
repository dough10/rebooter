FROM node:argon

# Create app directory
RUN mkdir -p /usr/src/rebooter
WORKDIR /usr/src/rebooter

# Install app dependencies
COPY package.json /usr/src/rebooter
RUN npm install

# Bundle app source
COPY . /usr/src/rebooter

EXPOSE 8080
CMD [ "node", "rebooter" ]
