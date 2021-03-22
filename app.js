const AWS = require('aws-sdk');
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

let S3;
if (process.env.IS_OFFLINE) {
  // ローカル開発時はS3RVERを使う
  S3 = new AWS.S3({
    s3ForcePathStyle: true,
    accessKeyId: 'S3RVER',
    secretAccessKey: 'S3RVER',
    endpoint: new AWS.Endpoint('http://localhost:4569'),
  });
} else {
  S3 = new AWS.S3();
}

// Receive Incoming WebHook
expressReceiver.router.post('/incoming', async (req, res) => {
  const body = JSON.parse(req.body);
  console.log(JSON.stringify(body, null, 2));

  body.primary_resources.forEach(async (resource) => {
    s3key = `ch-${req.query.channel}/pj-${body.project.id}/${resource.kind}-${resource.id}`

    threadTs = null;
    try {
      prev = await S3.getObject({
        Bucket: process.env.BUCKET_NAME,
        Key: s3key,
      }).promise();
      threadTs = prev.Body.toString()
    } catch (e) {
      console.log('ERROR:', e);
      if (e.code !== 'NoSuchKey') {
        throw e;
      }
    }

    response = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: req.query.channel,
      thread_ts: threadTs,
      text: `story: ${resource.name} / message: ${body.message}`,
    });
    console.log(response);

    if (!threadTs) {
      // スレッドが保存されてなければ保存する
      await S3.putObject({
        Bucket: process.env.BUCKET_NAME,
        Key: s3key,
        Body: Buffer.from(response.ts)
      }).promise();
    }

    res.sendStatus(200);
  });
});

module.exports.handler = serverlessExpress({
  app: expressReceiver.app,
});
