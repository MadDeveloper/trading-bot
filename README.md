<<<<<<< HEAD
# Theddy the bot

## Installation

```bash
git clone https://gitlab.com/MadDeveloper/bot-warhead.git theddy
cd theddy
npm install --global typescript lite-server
npm install
```

Create your API keys on the platform (binance, gdax, etc.) and create the file `keys.(platform).ts` associated in the folder `~/src/config/`.
This file should have the following code:

```javascript
export default {
    secret: "...",
    key: "...",
    passphrase: "...",
}
```

## Getting started

You can configure the bot with the config file, one file per market (for example: `config.binance.ts` for the Binance market).
When you are ready, you can build and start the bot with one command:

```bash
npm run build:start
```

Or one by step:

```bash
npm run build && npm start
````

If you want to see in realtime the chart:

```bash
npm run chart
```

And then you can go to http://localhost:3000 and watch the magic happening!

## Docker
### Setup

```
touch envfile
```

Then edit envfile like this:

```bash
cat envfile
BINANCE_API_KEY=xxxxxx
BINANCE_API_SECRET=xxxxx
GDAX_API_KEY=xxxx
GDAX_API_SECRET=xxxxx
GDAX_API_PASSPHRASE=xxxxx
```

### Build

```bash
docker build -t theddy .
```

### Run

```bash
docker run --env-file envfile -p 3000:3000 theddy
```
