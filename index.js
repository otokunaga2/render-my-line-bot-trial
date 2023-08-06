'use strict';

require('date-utils');
require('dotenv').config();

const querystring = require('querystring')
const { Client } = require("pg");
const express = require('express');
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 3000;

const config = {
	channelSecret: process.env.CHANNEL_SECRET,
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};

const pgConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
}

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

const lineClient = new line.Client(config);
const pgClient = new Client(pgConfig);
pgClient.connect();

app.get('/remind_medicine', (req, res) =>{
    // テキストで通知を全員に一斉通知
    const messages = [{
        type: 'text',
        text: 'お昼の薬の時間です。\nいつもの場所に置いてあるお薬を飲んでください。'
    }];
    lineClient.broadcast(messages)
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
                type: 'postback',
                label: 'はい',
                data: 'type=medicine_confirm&answer=はい',
                displayText: 'はい',
            },
            {
                type: 'postback',
                label: 'いいえ',
                data: 'type=medicine_confirm&answer=いいえ',
                displayText: 'いいえ',
            }
          ]
        }
    }];
    lineClient.broadcast(messages)
        .then(data => res.json(data))
        .catch(e => res.status(500).send(e));
});

async function handleEvent(event) {
    if (event.type == 'postback') {
        insertReply(event);
    }

	if (event.type !== 'message' || event.message.type !== 'text') {
		return Promise.resolve(null);
	}

    if (event.message.text === '薬') {
        const date = new Date();
        date.setHours(date.getHours() - 3);
        const currentTime = date.toFormat('YYYY-MM-DD HH24:MI:SS');

        const query = {
            text: 'SELECT * FROM line_reply WHERE type=$1 AND user_id=$2 AND created_at>=$3',
            values: ['medicine_confirm', event.source.userId, currentTime]
        };
        pgClient
            .query(query)
            .then((res) => {
                let text = '薬はまだ飲んでません。';
                if (res.rows.length > 0 && res.rows[0].answer === 'はい') {
                    text = '薬は飲みました。';
                }
                return lineClient.replyMessage(event.replyToken, {
                    type: 'text',
                    text: text
                })
            })
            .catch((e) => {
                console.error(e.stack);
                return Promise.resolve(null);
            });
    } else {
        return lineClient.replyMessage(event.replyToken, {
            type: 'text',
            text: event.message.text //実際に返信の言葉を入れる箇所
        });
    }	
}

function insertReply(event) {
    const date = new Date();
    const currentTime = date.toFormat('YYYY-MM-DD HH24:MI:SS');

    const params = querystring.parse(event.postback.data);

    const query = {
        text: `INSERT INTO line_reply (type, answer, user_id, created_at) VALUES ($1, $2, $3, $4)`,
        values: [params.type, params.answer, event.source.userId, currentTime],
    };
    pgClient
        .query(query)
        .then((res) => {
            console.log(res);
        })
        .catch((e) => {
            console.error(e.stack);
        });
}

app.listen(PORT);
console.log(`Server running at ${PORT}`);
