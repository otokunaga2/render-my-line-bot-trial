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
	console.log(`webhookメッセージを受信 ${JSON.stringify(req.body.events)}`);
	if (req.body.events == []){
		console.log('webhookの確認通知メッセージを受信')
		return Promise.resolve(null);
	}

	Promise
		.all(req.body.events.map(handleEvent))
		.then((result) => res.json(result));
});

const client = new line.Client(config);

app.get('/remind_medicine', (req, res) =>{
    // テキストで通知を全員に一斉通知
    const messages = [{
        type: 'text',
        text: 'お昼の薬の時間です。\nいつもの場所に置いてあるお薬を飲んでください。'
    }];
    client.broadcast(messages)
        .then(data => res.json(data))
        .catch(e => res.status(500).send(e));
});

app.get('/confirm_medicine', (req, res) => {
    // 薬を飲んだか確認
    const messages = [{
        type: 'template',
        altText: '薬の服薬の確認です',
        template: {
          type: 'confirm',
          text: '薬を飲みましたか？',
          actions: [
            {
              type: 'message',
              label: 'はい',
              text: 'はい',
            },
            {
              type: 'message',
              label: 'いいえ',
              text: 'いいえ'
            }
          ]
        }
    }];
    client.broadcast(messages)
        .then(data => res.json(data))
        .catch(e => res.status(500).send(e));
});

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
