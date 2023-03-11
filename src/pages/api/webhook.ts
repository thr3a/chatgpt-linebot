import { NextApiRequest, NextApiResponse } from "next";
import { Client, middleware } from "@line/bot-sdk";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'xxx',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'xxx',
};

const client = new Client(config);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    middleware(config)(req, res, async () => {
      const events = req.body.events;
      for (const event of events) {
        if (event.type === "message" && event.message.type === "text") {
          // オウム返しする
          await client.replyMessage(event.replyToken, event.message);
        }
      }
    });
  } else {
    res.status(405).end();
  }
}
