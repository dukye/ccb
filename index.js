const Discord = require('discord.js');
const Client = require('node-rest-client').Client;
var rp = require('request-promise');
const bot = new Discord.Client();

var api = new Client();

const getTrade = async(currencypair, exchange = 'kraken') => {
  let options = null;
  if (exchange === 'gdax') {
    options = {
      method: 'GET',
      uri: `https://api.gdax.com/products/${currencypair}/stats`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
      },
      body: {},
      json: true // Automatically stringifies the body to JSON
    };
  } else {
    options = {
      method: 'POST',
      uri: 'https://api.kraken.com/0/public/Spread',
      body: {
        pair: currencypair
      },
      json: true // Automatically stringifies the body to JSON
    };
  }
  return (options ? await rp(options) : false);
}

const getAssetPairs = async() => {
  // https://api.gdax.com/products
  const options = {
    method: 'GET',
    uri: 'https://api.kraken.com/0/public/AssetPairs',
    json: true,
  };

  return await rp(options);
}

bot.on('ready', () => {
  console.log('I am ready!');
});

bot.on('message', message => {
  const user = message.author;

  if (message.content === 'ping') {
    message.reply('pong');
  }
  const msg = message.content;

  /**
   * Get assets pairs
   * @type {RegExp}
   */
  const regPair = new RegExp('^assetpairs$', 'i');
  const matchassets = msg.match(regPair);
  if (matchassets) {
    // console.log(msg.match(matchassets));
    getAssetPairs()
      .then((result) => {
        if (result && result.result) {
          const dataPair = result.result;
          const allpairs = [];
          message.reply(`\nAsset pairs\n-----\n${Object.keys(dataPair).join(', ')}`);
        }
      })
      .catch(err => console.log(err));
  }

  /**
   * Last trade
   * @type {RegExp}
   */
  const reg = new RegExp('^((lasttrade)\ ([A-Z\-]{1,10})(\ (gdax|kraken)?)?)', 'i');
  const match = msg.match(reg);
  // console.log(match);
  if (match) {
    const currency = match[3];
    const exchange = match[5] || null; // without space ' gdax', 'gdax'

    // console.log(`--> Request from ${user.username}`);
    getTrade(currency, exchange)
      .then((result) => {
        // console.log(result);
        // Gdax
        if (result && result.last){
          const tradeLast = parseFloat(result.last).toFixed(2);
          const tradeLow = parseFloat(result.low).toFixed(2);
          const tradeHigh = parseFloat(result.high).toFixed(2);
          message.reply(`\nLast trade on Gdax\n-----\nLast: ${tradeLast}\nLow: ${tradeLow}\nHigh: ${tradeHigh}`);
        }
        // Kraken
        if (result && result.result) {
          const data = result.result[currency];
          const last = result.result['last'];
          data.forEach((obj) => {
            if (obj[0] === last) {
              const tradeBid = parseFloat(obj[1]).toFixed(2);
              const tradeAsk = parseFloat(obj[2]).toFixed(2);
              message.reply(`\nLast trade at ${new Date(new Date().getTime(parseInt(obj[0])))}:\n-----\nBid: ${tradeBid}€\nAsk: ${tradeAsk}`);
            }
          })
        }
      })
      .catch(err => console.log(err));
  }
});
console.log(process.env.DISCORDBOT)
console.log(process.env.PORT)
bot.login(process.env.DISCORDBOT);


/*
var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(process.env.PORT || 8080, '127.0.0.1');
console.log('Server currently listening...');
*/

/*
var args = {
  data: { pair: currency },
  headers: { 'Content-Type': 'application/json' },
};

api.post('https://api.kraken.com/0/public/Spread', args, (data, response) => {
  // parsed response body as js object
  console.log(data);
  // raw response
  console.log(response);
});
*/
