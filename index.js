const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP = '+447888368461';

const conversations = {};

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

const SYSTEM_PROMPT = `You are a sales assistant for Comfy Sofa Ltd, a UK furniture business. You reply like a real human — short, friendly, to the point. No bullet points, no long lists, no corporate language.

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

DELIVERY: Free UK delivery, 3-7 working days, free assembly included.

PAYMENT: Cash on delivery (COD) only. If customer specifically asks about bank transfer, that's also available.

PHOTOS: When a customer asks about a specific sofa or wants to see it, include [SEND_IMAGE:orlando] or [SEND_IMAGE:roma] etc. in your reply. Always send a photo when first discussing a specific product.

WHATSAPP: ${WHATSAPP} — give this when customer wants to order or has a complex question.

HOW TO REPLY:
- Keep it under 2-3 sentences max
- Sound like a real person texting, not a robot
- No bullet points, no bold text, no long lists
- Ask one simple question to move the sale forward
- Never mention any website links
- If they ask for price, just say the price simply
- If they want to order, give them the WhatsApp number

EXAMPLES:
Customer: "How much is the Orlando?"
You: "The Orlando is £899 — comes with LED lights and a wireless charger, available in black or grey. Which colour were you thinking? [SEND_IMAGE:orlando]"

Customer: "Do you deliver to Birmingham?"
You: "Yes we deliver free anywhere in the UK, usually 3-7 days. Assembly included too 👍"

Customer: "How do I pay?"
You: "We do cash on delivery so you pay when it arrives — no upfront payment needed 😊"

Customer: "I want to order"
You: "Great! Drop us a message on WhatsApp and we'll sort everything for you — ${WHATSAPP} 👍"`;

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

  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: 'user', content: messageText });
  if (conversations[senderId].length > 10) {
    conversations[senderId] = conversations[senderId].slice(-10);
  }

  try {
    await sendTyping(senderId);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: conversations[senderId]
    });

    let reply = response.content[0].text;

    // Send images if triggered
    const imageMatches = reply.match(/\[SEND_IMAGE:(\w+)\]/gi);
    if (imageMatches) {
      for (const match of imageMatches) {
        const type = match.replace(/\[SEND_IMAGE:/i, '').replace(']', '').toLowerCase();
        const url = IMAGE_MAP[type];
        if (url) {
          await sendImage(senderId, url);
          await new Promise(r => setTimeout(r, 600));
        }
      }
      reply = reply.replace(/\[SEND_IMAGE:\w+\]/gi, '').trim();
    }

    conversations[senderId].push({ role: 'assistant', content: reply });
    if (reply) await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Hey! Sorry about that — message us on WhatsApp and we'll get back to you straight away: ${WHATSAPP} 👍`);
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
