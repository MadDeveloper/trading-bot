# Theddy the bot

## Installation

```bash
git clone https://gitlab.com/MadDeveloper/bot-warhead.git theddy
cd theddy
npm install --global typescript lite-server
npm install
```

Create your API keys on the platform (binance, gdax, etc.) and export them as environment vars.
For exemple, on Linux, add to your ~/.bashrc the following lines:

```bash
export BINANCE_API_KEY=lorem
export BINANCE_API_SECRET=lorem
export BINANCE_API_PASSPHRASE=lorem
export GDAX_API_KEY=lorem
export GDAX_API_SECRET=lorem
export GDAX_API_PASSPHRASE=lorem
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

```bash
touch envfile
```

Then add the following lines to the envfile:

```bash
BINANCE_API_KEY=xxxxxx
BINANCE_API_SECRET=xxxxx
BINANCE_API_PASSPHRASE=xxxxx
GDAX_API_KEY=xxxx
GDAX_API_SECRET=xxxxx
GDAX_API_PASSPHRASE=xxxxx
```

### Build

```bash
docker build -t theddy .
```

or

```bash
npm run docker:build
```

### Run

```bash
docker run -it --env-file envfile -p 3000:3000 theddy
```

or

```bash
npm run docker:run
```