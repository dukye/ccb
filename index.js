const Discord = require('discord.js');
const Client = require('node-rest-client').Client;
const rp = require('request-promise');
const bot = new Discord.Client();
const api = new Client();

// Just run a little http page
var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(process.env.PORT || 8080);
console.log('HTTP Server running & listening...');


/**
 * Rich embed discord
 * @type {Discord}
 */
const makeEmbed = (title, desc, elements = []) => {
  const embed = new Discord.RichEmbed()
    .setTitle(`${title}`)
    // .setAuthor('CryptoBot', 'http://www.scpc.org.au/wp-content/uploads/2016/10/rocketkid-1024x682.jpg')
    .setColor(0x4671ed)
    .setDescription(desc)
    .setTimestamp()
    .setFooter('-- to the moon');

    elements.forEach((obj, i) => {
      embed.addField(obj.title, obj.value, true)
      if ((i+=1) < elements.length) {
        // embed.addBlankField(true);
      }
    });
  return embed;
};

/**
 * getTrade
 * @param currencypair string
 * @type {function}
 * @param exhcange string || null
 * @return Promise
 */
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

/**
 * getAssetPairs
 * @type {function}
 * @param currencypair string
 * @param exhcange string || null
 * @return Promise
 */
const getAssetPairs = async(exchange = 'kraken') => {
  let options = null;
  if (exchange === 'gdax') {
    options = {
      method: 'GET',
      uri: 'https://api.gdax.com/products',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
      },
      json: true,
    };
  } else {
    options = {
      method: 'GET',
      uri: 'https://api.kraken.com/0/public/AssetPairs',
      json: true,
    };
  }

  return await rp(options);
}

bot.on('ready', () => {
  console.log('Discord Bot is running...');
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
  const regPair = new RegExp('^(assetpairs(\ (gdax|kraken)?)?)$', 'i');
  const matchassets = msg.match(regPair);
  if (matchassets) {
    const exchange = matchassets[3] || null; // without space ' gdax', 'gdax'
    getAssetPairs(exchange)
      .then((result) => {
        if (result && result[0] && result[0].id) {
          const allpairs = result.map((obj) => obj.id);
          message.reply(`\n[GDAX] Asset pairs\n-----\n${allpairs.join(', ')}`);
        }
        if (result && result.result) {
          const dataPair = result.result;
          const allpairs = [];
          message.reply(`\n[KRAKEN] Asset pairs\n-----\n${Object.keys(dataPair).join(', ')}`);
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
          // message.reply(`\n[GDAX] Last trade on Gdax\n-----\nLast: ${tradeLast}\nLow: ${tradeLow}\nHigh: ${tradeHigh}`);
          message.channel.send(
            makeEmbed(
              'GDAX',
              'Last trade',
              [{
                title: 'Last',
                value: `${tradeLast}€`,
              }, {
                title: 'High',
                value: `${tradeHigh}€`,
              }, {
                title: 'Low',
                value: `${tradeLow}€`,
              }]
            )
          );
        }
        // Kraken
        if (result && result.result) {
          const data = result.result[currency];
          const last = result.result['last'];
          data.forEach((obj) => {
            if (obj[0] === last) {
              const tradeBid = parseFloat(obj[1]).toFixed(2);
              const tradeAsk = parseFloat(obj[2]).toFixed(2);
              // message.reply(`\n[KRAKEN] Last trade at ${new Date(new Date().getTime(parseInt(obj[0])))}:\n-----\nBid: ${tradeBid}€\nAsk: ${tradeAsk}`);
              message.channel.send(
                makeEmbed(
                  'KRAKEN',
                  'Last trade',
                  [{
                    title: 'Bid',
                    value: `${tradeBid}€`,
                  }, {
                    title: 'Ask',
                    value: `${tradeAsk}€`,
                  }]
                )
              );
            }
          })
        }
      })
      .catch(err => console.log(err));

      /**
       * 
       */
      const regPair = new RegExp('^!(\w+)\ \$(\w+)\ ([\w\.\s]+)$', 'i');
      const matchcommands = msg.match(regPair);
      if (matchcommands) {
        console.log('command', matchcommands);
      }
  }
});

bot.login(process.env.DISCORDBOT);
