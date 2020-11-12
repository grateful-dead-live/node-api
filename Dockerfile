FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

RUN npm install -g pm2
RUN pm2 install typescript


# Bundle app source
COPY . .

EXPOSE 8060
#CMD [ "npm", "start" ]
RUN NODE_ENV=production
CMD ["pm2-runtime", "start", "src/server.ts", "--watch"]