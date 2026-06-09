const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP = '+447888368461';

// Store full conversation per customer
const conversations = {};
const orderData = {};

const IMAGE_MAP = {
  'orlando': 'https://mynewsofaltd.co.uk/cdn/shop/files/11.webp?v=1775221877&width=1080',
  'roma': 'https://mynewsofaltd.co.uk/cdn/shop/files/19_de87cfc0-3c3d-459b-98a6-e6739ec17854.jpg?v=1771944881&width=1080',
  'nova': 'https://mynewsofaltd.co.uk/cdn/shop/files/Nova_Leather_Corner_Sofa.webp?v=1772291792&width=1080',
  'sara': 'https://mynewsofaltd.co.uk/cdn/shop/files/sara.jpg?v=1771943786&width=1080',
  'mns': 'https://mynewsofaltd.co.uk/cdn/shop/files/MNS_Leather_Corner_sofa.webp?v=1773065268&width=1080',
  'corner': 'https://mynewsofaltd.co.uk/cdn/shop/files/Right.jpg?v=1732558652&width=1080',
  'chesterfield': 'https://mynewsofaltd.co.uk/cdn/shop/files/2_ed3999c5-8567-4bda-9462-f064b490c1b0.jpg?v=1747492788&width=1080',
  'ushape': 'https://mynewsofaltd.co.uk/cdn/shop/files/2_ed3999c5-8567-4bda-9462-f064b490c1b0.jpg?v=1747492788&width=1080',
};

const SYSTEM_PROMPT = `You are a sales assistant for Comfy Sofa Ltd, a UK sofa business. You reply like a real human — warm, friendly, short and to the point. No bullet points, no long messages, no corporate language. Think of yourself as a helpful person texting back, not a robot.

PRODUCTS & PRICES:
- Orlando Electric Recliner 3+2 (LED lights + wireless charger): £899 — Black or Grey
- Nova Electric Recliner Leather Corner: £749 — Grey
- Sara Leather Electric Recliner Corner: £749 — Grey
- Roma Fabric Recliner 3+2 (cup holders): £699 — Grey, Black, Brown
- MNS Leather Corner Sofa 230x230cm: £579 — Grey, Black, Brown
- Corner Sofas: from £399 — Grey, Black, Brown, Cream, Mink, Beige, Platinum Grey
- Chesterfield Sofas: from £499 — Grey, Black, Brown, Cream
- U-Shape Sofas: from £799 — Grey, Black, Brown, Cream, Mink
- Sofa Beds: from £499

DELIVERY:
- Free delivery anywhere in the UK
- 2 to 4 working days
- Free assembly included
- If customer asks for an exact day or date: "Yes that's fine, just let us know what works for you"
- If customer asks about time: "We'll give you a ring the day before delivery to let you know the exact time — our delivery process is very smooth 😊"

PAYMENT: Cash on delivery — you pay when your sofa arrives. If customer asks about bank transfer, that's also available.

PHOTOS: When discussing a specific sofa for the first time, always include [SEND_IMAGE:orlando] or [SEND_IMAGE:roma] etc. to send a photo.

ORDER TAKING:
- When customer seems interested or ready, ask: "Would you like to place your order? 😊"
- If they say yes, reply EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"
- Once they provide their details, confirm: "Perfect, thank you! Your order has been noted. We'll be in touch shortly to confirm your delivery date 👍"
- If they have questions after ordering, answer them warmly

CONVERSATION MEMORY:
- Remember what sofa they were asking about throughout the conversation
- If they said they liked grey earlier, remember that
- Build rapport naturally — if they mention something personal, acknowledge it

HOW TO REPLY:
- Max 2-3 sentences
- Sound human, warm and natural
- Never use bullet points or bold text in replies
- Never mention any website
- One question at a time to move the conversation forward
- Use the odd emoji to feel natural but don't overdo it

EXAMPLE REPLIES:
"The Orlando is £899, comes with LED lights and a wireless charger. Available in black or grey — which were you thinking?"
"We deliver free anywhere in the UK, usually 2-4 days and our team will assemble it for you too 😊"
"Yes we can arrange a specific day, no problem at all. Which day works best for you?"
"We'll give you a ring the day before to let you know the exact time — our delivery process is very smooth 😊"
"Cash on delivery so you only pay when it arrives — no upfront payment needed 👍"`;

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
  const messageText = event.message?.text;
  if (!messageText) return;

  // Init conversation history for this customer
  if (!conversations[senderId]) conversations[senderId] = [];

  // Add customer message to history
  conversations[senderId].push({ role: 'user', content: messageText });

  // Keep last 20 messages for memory
  if (conversations[senderId].length > 20) {
    conversations[senderId] = conversations[senderId].slice(-20);
  }

  try {
    await sendTyping(senderId);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      system: SYSTEM_PROMPT,
      messages: conversations[senderId]
    });

    let reply = response.content[0].text;

    // Send images if AI triggered them
    const imageMatches = reply.match(/\[SEND_IMAGE:(\w+)\]/gi);
    if (imageMatches) {
      for (const match of imageMatches) {
        const type = match.replace(/\[SEND_IMAGE:/i, '').replace(']', '').toLowerCase();
        const url = IMAGE_MAP[type];
        if (url) {
          await sendImage(senderId, url);
          await new Promise(r => setTimeout(r, 700));
        }
      }
      reply = reply.replace(/\[SEND_IMAGE:\w+\]/gi, '').trim();
    }

    // Add AI reply to conversation history
    conversations[senderId].push({ role: 'assistant', content: reply });

    if (reply) await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Hey sorry about that! Drop us a message on WhatsApp and we'll get back to you right away — ${WHATSAPP} 👍`);
  }
}

async function sendMessage(recipientId, text) {
  try {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages`,
      { recipient: { id: recipientId }, message: { text } },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (e) { console.error('sendMessage error:', e.message); }
}

async function sendImage(recipientId, imageUrl) {
  try {
    await axios.post(`https://graph.facebook.com/v18.0/me/messages`,
      { recipient: { id: recipientId }, message: { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } } },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (e) { console.error('sendImage error:', e.message); }
}

async function sendTyping(recipientId) {
  await axios.post(`https://graph.facebook.com/v18.0/me/messages`,
    { recipient: { id: recipientId }, sender_action: 'typing_on' },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  ).catch(() => {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nova Livings chatbot running on port ${PORT}`));
