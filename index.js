const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const conversations = {};

const SYSTEM_PROMPT = `You are a helpful sales assistant for Nova Livings Ltd, a UK furniture company. You help customers with:

PRODUCTS & PRICING:
- 3+2 Recliner Sofa Sets: from £599
- Corner Sofas: from £699
- Electric Recliner Sets: from £799
- Manual Recliner Sofas: from £499
- U-Shape Sofas: from £899
- L-Shape Sofas: from £649

DELIVERY: Free across all UK mainland, 3-5 working days, free assembly included.
COLOURS: Black, Grey, Brown, Cream, Mink, Chocolate
PAYMENT: Full payment or 0% finance available

RULES:
- Be friendly and helpful
- Keep replies under 150 words
- If unsure, ask for their WhatsApp number to follow up
- Use UK English`;

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== 'page') return;
  for (const entry of body.entry) {
    for (const event of entry.messaging) {
      if (event.message && !event.message.is_echo) {
        await handleMessage(event);
      }
    }
  }
});

async function handleMessage(event) {
  const senderId = event.sender.id;
  const messageText = event.message.text;
  if (!messageText) return;
  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: 'user', content: messageText });
  if (conversations[senderId].length > 10) {
    conversations[senderId] = conversations[senderId].slice(-10);
  }
  try {
    await sendTyping(senderId);
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: conversations[senderId]
    });
    const reply = response.content[0].text;
    conversations[senderId].push({ role: 'assistant', content: reply });
    await sendMessage(senderId, reply);
  } catch (error) {
    console.error('Error:', error);
    await sendMessage(senderId, 'Sorry, please message us on WhatsApp and our team will help right away!');
  }
}

async function sendMessage(recipientId, text) {
  await axios.post(`https://graph.facebook.com/v18.0/me/messages`,
    { recipient: { id: recipientId }, message: { text } },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  );
}

async function sendTyping(recipientId) {
  await axios.post(`https://graph.facebook.com/v18.0/me/messages`,
    { recipient: { id: recipientId }, sender_action: 'typing_on' },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  ).catch(() => {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nova Livings chatbot running on port ${PORT}`));
