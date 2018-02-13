FROM sandrokeil/typescript

# Install packages with efficient layer caching.
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN cp -a /tmp/node_modules /app/
RUN npm i -g lite-server

WORKDIR /app
COPY . /app

RUN rm -f data.json
RUN rm -rf dist/

EXPOSE 3000

CMD npm run build:start & lite-server