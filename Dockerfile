FROM nodesource/centos7:0.12.7 
FROM node:argon
RUN mkdir -p /usr/src/rebooter
WORKDIR /usr/src/rebooter
COPY . /usr/src/rebooter
RUN npm install
EXPOSE 8080
CMD [ "node", "rebooter.js" ]
