import { NextApiRequest, NextApiResponse } from 'next';
import { Client, middleware, TextMessage, WebhookEvent, MessageAPIResponseBase } from '@line/bot-sdk';
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from 'openai';
import { getDatabase, ref, set, get } from 'firebase/database';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? 'xxx',
  channelSecret: process.env.LINE_CHANNEL_SECRET ?? 'xxx',
};
const client = new Client(config);

const openAiConfig = new Configuration({
  apiKey: process.env.OPENAI_APIKEY ?? 'xxx'
});
const openai = new OpenAIApi(openAiConfig);

const saveHistory = async (userId: string, histories: ChatCompletionRequestMessage[]) => {
  try {
    const db = getDatabase();
    await set(ref(db, `history/${userId}`), histories);
    console.log('saved');
  } catch (error) {
    console.error(error);
  }
};
  
const getHistory = async (userId: string): Promise<ChatCompletionRequestMessage[]> => {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, `history/${userId}`));
    if (snapshot.exists()) {
      const histories: ChatCompletionRequestMessage[] = snapshot.val();
      return histories;
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
};

const fetchChatGPT = async (messages: ChatCompletionRequestMessage[]): Promise<string> => {
  messages.unshift({
    role: 'system',
    content: '日本語でしりとりをしてください。'
  });
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: messages,
  });
  const text = completion.data.choices[0].message?.content as string;
  return text;
};

const handleMessage = async (event: WebhookEvent): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }
  const { text } = event.message;
  console.log(text);
  const userId = event.source.userId ?? 'dummy';
  const histories = await getHistory(userId);
  const newMessage:ChatCompletionRequestMessage = {role: 'user', content: text};
  histories.push(newMessage);
  const replyText = await fetchChatGPT(histories);
  histories.push({role: 'assistant',content: replyText});
  await saveHistory(userId, histories);

  // LINE返信
  const replyObject: TextMessage = {
    type: 'text',
    text: replyText
  };
  await client.replyMessage(event.replyToken, replyObject);
  console.log(userId, replyText);
  
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
