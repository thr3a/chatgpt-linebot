import { NextApiRequest, NextApiResponse } from 'next';
import { Client, middleware, TextMessage, WebhookEvent, MessageAPIResponseBase } from '@line/bot-sdk';
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from 'openai';
import { getDatabase, ref, set, get } from 'firebase/database';
import { BASE_PROMPT } from '@/constant/env';
import { initializeFirebaseApp } from '@/lib/firebase/firebase';

initializeFirebaseApp();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? 'xxx',
  channelSecret: process.env.LINE_CHANNEL_SECRET ?? 'xxx',
};
const client = new Client(lineConfig);

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
  // 先頭に追加
  messages.unshift({
    role: 'system',
    content: BASE_PROMPT
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
  const userId = event.source.userId ?? 'dummy';
  let replyText = '';
  if (/^(クイズ|くいず|a|b|c|A|B|C|1|2|3)$/.test(text)) {
    const histories = /^(クイズ|くいず)$/.test(text) ? [] : await getHistory(userId);
    const textForChatGPT = /^(クイズ|くいず)$/.test(text) ? 'クイズを出題してください。' : text;
    const newMessage:ChatCompletionRequestMessage = {role: 'user', content: textForChatGPT};
    histories.push(newMessage);
    replyText = await fetchChatGPT(histories);
    histories.push({role: 'assistant',content: replyText});
    // 直近５件を保存する
    await saveHistory(userId, histories.slice(-5));
  } else {
    replyText = '「クイズ」と言うとのんちゃんクイズが始まります。解答する場合は「a」のように送ってね';
  }
  // LINE返信
  const replyObject: TextMessage = {
    type: 'text',
    text: replyText
  };
  await client.replyMessage(event.replyToken, replyObject);
  console.log(text, userId, replyText);
  
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    middleware(lineConfig)(req, res, async () => {
      const events = req.body.events;
      for (const event of events) {
        handleMessage(event);
      }
    });
    res.status(200).json({ name: 'John Doe' });
  } else {
    res.status(405).end();
  }
}
