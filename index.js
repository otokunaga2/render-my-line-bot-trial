'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 3000;

const config = {
	channelSecret: process.env.CHANNEL_SECRET,
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const app = express();

app.get('/', (req, res) => res.send('Hello  BOT!(GET)')); //ブラウザ確認用(無くても問題ない)
app.post('/webhook', line.middleware(config), (req, res) => {
	console.log(`webhookメッセージを受信 ${req.body.events}`);
	if (req.body.events == []){
		console.log('webhookの確認通知メッセージを受信')
		return Promise.resolve(null);
	}

	Promise
		.all(req.body.events.map(handleEvent))
		.then((result) => res.json(result));
});

const client = new line.Client(config);

async function handleEvent(event) {
	if (event.type !== 'message' || event.message.type !== 'text') {
		return Promise.resolve(null);
	}

	return client.replyMessage(event.replyToken, {
		type: 'text',
		text: event.message.text //実際に返信の言葉を入れる箇所
	});
}

app.listen(PORT);
console.log(`Server running at ${PORT}`);
