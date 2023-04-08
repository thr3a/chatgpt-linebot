import { NextApiRequest, NextApiResponse } from 'next';
import { Client, TextMessage, WebhookEvent, MessageAPIResponseBase } from '@line/bot-sdk';
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from 'openai';
import { getDatabase, ref, set, get, remove } from 'firebase/database';
import { BASE_PROMPT_GIRL, WEATHER_CODES, GIRL_HUMAN_TEMPLATE } from '@/constant/env';
import { initializeFirebaseApp } from '@/lib/firebase/firebase';
import dayjs from 'dayjs';

import { SystemChatMessage, HumanChatMessage, AIChatMessage, BaseChatMessage } from 'langchain/schema';
import { ChatOpenAI } from 'langchain/chat_models';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder, PromptTemplate } from 'langchain/prompts';
initializeFirebaseApp();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? 'xxx',
  channelSecret: process.env.LINE_CHANNEL_SECRET ?? 'xxx',
};
const client = new Client(lineConfig);

const chat = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_APIKEY,
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7,
});

const getHistory = async (userId: string): Promise<ChatMessageHistory> => {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, `history/${userId}`));
    if (snapshot.exists()) {
      const histories = snapshot.val().map((x:{ type: string, text: string }) => {
        if(x.type === 'human' && x.text !== undefined) {
          const matchResult = x.text.match(/私のチャット:(.+)\n/);
          return new HumanChatMessage(matchResult && matchResult[1] || x.text);
        } else {
          return new AIChatMessage(x.text);
        }
      });
      return new ChatMessageHistory(histories);
    } else {
      return new ChatMessageHistory();
    }
  } catch (error) {
    console.error(error);
    return new ChatMessageHistory();
  }
};

const saveHistory = async (userId: string, histories: ChatMessageHistory) => {
  try {
    const db = getDatabase();
    const data: {type: string, text: string}[] = histories.messages.slice(-5).map((x: BaseChatMessage) => {
      return {type: x._getType(), text: x.text};
    });
    await set(ref(db, `history/${userId}`), data);
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
  let botReplyText = '';
  if (/^クリア$/.test(text)) {
    await clearHistory(userId);
    botReplyText = 'クリアしました';
  } else if (/^統計$/.test(text)) {
    // const histories = await getHistory(userId);
    // if (histories.length > 0) {
    //   botReplyText = histories[0].content;
    // }
  } else {
    const histories = await getHistory(userId);
    const weather = await getWeather();
    const SystemPrompt = await PromptTemplate.fromTemplate(BASE_PROMPT_GIRL).format({
      now: dayjs().format('YYYY/MM/DD HH:mm dddd'),
      today_weather: weather.today.weather,
      today_max_temp: weather.today.max_temp,
      tomorrow_weather: weather.tomorrow.weather,
      tomorrow_max_temp: weather.tomorrow.max_temp
    });
    const HumanPrompt = await PromptTemplate.fromTemplate(GIRL_HUMAN_TEMPLATE).format({
      human_message: text,
    });
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(SystemPrompt),
      new MessagesPlaceholder('history'),
      HumanMessagePromptTemplate.fromTemplate('{input}')
    ]);
    const memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      chatHistory: histories
    });
    const chain = new ConversationChain({
      memory: memory,
      prompt: chatPrompt,
      llm: chat,
    });
    const response = await chain.call({input: HumanPrompt});
    await saveHistory(userId, memory.chatHistory);
    botReplyText = response.response;
  }
  // LINE返信
  const replyObject: TextMessage = {
    type: 'text',
    text: botReplyText
  };
  console.log(text, userId, botReplyText);
  await client.replyMessage(event.replyToken, replyObject);
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
