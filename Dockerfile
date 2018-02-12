FROM sandrokeil/typescript

WORKDIR /app
COPY . /app

EXPOSE 3000

RUN npm install
RUN npm i -g lite-server

CMD npm run build:start & lite-server