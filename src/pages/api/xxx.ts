import { NextApiRequest, NextApiResponse } from 'next';
import { Client, TextMessage, WebhookEvent, MessageAPIResponseBase } from '@line/bot-sdk';
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from 'openai';
import { getDatabase, ref, set, get, remove } from 'firebase/database';
import { BASE_PROMPT_GIRL, WEATHER_CODES } from '@/constant/env';
import { initializeFirebaseApp } from '@/lib/firebase/firebase';
import dayjs from 'dayjs';

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

const clearHistory = async (userId: string) => {
  try {
    const db = getDatabase();
    await remove(ref(db, `history/${userId}`));
    console.log('clear');
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
    console.error(error);
    return [];
  }
};

const fetchChatGPT = async (messages: ChatCompletionRequestMessage[]): Promise<string> => {
  // 先頭に追加
  messages.unshift({
    role: 'system',
    content: BASE_PROMPT_GIRL
  }); 
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: messages,
  });
  const text = completion.data.choices[0].message?.content as string;
  return text;
};

const getWeather = async() => {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=35.64&longitude=139.70&daily=weathercode,temperature_2m_max&forecast_days=2&timezone=Asia%2FTokyo';
  const response = await fetch(url);
  const json = await response.json();
  return {
    today: {
      weather: WEATHER_CODES[json.daily.weathercode[0]],
      max_temp: json.daily.temperature_2m_max[0]
    },
    tomorrow: {
      weather: WEATHER_CODES[json.daily.weathercode[1]],
      max_temp: json.daily.temperature_2m_max[1]
    }
  };
};

const handleMessage = async (event: WebhookEvent): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }
  const { text } = event.message;
  const userId = event.source.userId ?? 'dummy';
  let replyText = '';
  if (/^クリア$/.test(text)) {
    await clearHistory(userId);
    replyText = 'クリアしました';
  } else {
    const histories = await getHistory(userId);
    const weather = await getWeather();
    const myText = `
現在の日時:${dayjs().format('YYYY/MM/DD HH:mm dddd')}
今日の天気:${weather.today.weather} 最高気温:${weather.today.max_temp}
明日の天気:${weather.tomorrow.weather} 最高気温:${weather.tomorrow.max_temp}
私のチャット:${text}
Chatbotのチャット:`;
    const newMessage:ChatCompletionRequestMessage = {role: 'user', content: myText};
    histories.push(newMessage);
    replyText = await fetchChatGPT(histories);
    histories.push({role: 'assistant',content: replyText});
    // 直近５件を保存する
    await saveHistory(userId, histories.slice(-5));
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
    const events = req.body.events;
    for (const event of events) {
      await handleMessage(event);
    }
    res.status(200).end();
  } else {
    res.status(405).end();
  }
}
