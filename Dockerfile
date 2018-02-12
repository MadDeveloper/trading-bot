FROM sandrokeil/typescript

# Install packages with efficient layer caching.
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/
RUN npm i -g lite-server

WORKDIR /app
COPY . /app

EXPOSE 3000

CMD npm run build:start & lite-server