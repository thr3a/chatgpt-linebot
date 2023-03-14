import { NextApiRequest, NextApiResponse } from 'next';
import { Client, middleware, TextMessage, WebhookEvent, MessageAPIResponseBase } from '@line/bot-sdk';
import {Configuration, OpenAIApi} from 'openai';
import { getApp } from 'firebase/app';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'xxx',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'xxx',
};
const client = new Client(config);

const openAiConfig = new Configuration({
  apiKey: process.env.OPENAI_APIKEY || 'xxx'
});
const openai = new OpenAIApi(openAiConfig);

const fetchChatGPT = async (message: string): Promise<string> => {
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }],
  });
  const text = completion.data.choices[0].message?.content as string;
  return text;
};

const handleMessage = async (event: WebhookEvent): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }
  const { text } = event.message;
  // const replyText = await fetchChatGPT(text);
  const userId = event.source.userId;
  const replyObject: TextMessage = {
    type: 'text',
    text: `userid: ${userId}`
  };
  await client.replyMessage(event.replyToken, replyObject);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    middleware(config)(req, res, async () => {
      const events = req.body.events;
      for (const event of events) {
        handleMessage(event);
      }
    });
  } else {
    res.status(405).end();
  }
}
