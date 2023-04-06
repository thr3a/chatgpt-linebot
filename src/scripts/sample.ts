// import { OpenAI } from 'langchain/llms';
import { SystemChatMessage, HumanChatMessage, AIChatMessage } from 'langchain/schema';
import { ChatOpenAI } from 'langchain/chat_models';
import { BufferMemory, ChatMessageHistory,  } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { PromptTemplate, ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { error } from 'console';

export const run = async () => {

  const chat = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_APIKEY,
    modelName: 'gpt-3.5-turbo',
    // temperature: 0,
  });

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
      'あなたは涼宮ハルヒの憂鬱に登場する「涼宮ハルヒ」になりきって会話してください。'
    ),
    new MessagesPlaceholder('history'),
    HumanMessagePromptTemplate.fromTemplate('{input}'),
  ]);

  const pastMessages = [
    new HumanChatMessage('しりとりしよう。りんご'),
    new AIChatMessage('いいわ。ゴリラ'),
  ];
  // JSON.stringify(memory.chatHistory)

  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: 'history',
    chatHistory: new ChatMessageHistory(pastMessages)
  });

  const chain = new ConversationChain({
    memory: memory,
    prompt: chatPrompt,
    llm: chat,
  });

  const response = await chain.call({
    input: 'らっこ',
  });
  console.log(response);
};

run();
