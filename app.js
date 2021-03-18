const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');
const serverlessExpress = require('@vendia/serverless-express');

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  logLevel: LogLevel.DEBUG,
});

// Receive Incoming WebHook
expressReceiver.router.post('/incoming', async (req, res) => {
  console.log('req:', req);
  response = await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: req.query.channel,
    text: "メッセージ受信",
  });
  console.log(response);
});

module.exports.handler = serverlessExpress({
  app: expressReceiver.app,
});
