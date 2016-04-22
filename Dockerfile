FROM node:4.0.0
RUN mkdir -p /usr/src/rebooter
WORKDIR /usr/src/rebooter
COPY . /usr/src/rebooter
RUN npm install
EXPOSE 8080
CMD [ "node", "rebooter.js" ]
