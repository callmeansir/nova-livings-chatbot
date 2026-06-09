const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP = '+447888368461';
const GITHUB_IMAGES = 'https://raw.githubusercontent.com/callmeansir/nova-livings-chatbot/main/images';

const conversations = {};
const customerContext = {};

const SOFAS_3_2 = [
  { id: 1, name: 'Roma Black 3+2 Recliner',    price: '£550', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.31.jpeg` },
  { id: 2, name: 'Rio Cord Grey 3+2 Recliner', price: '£550', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.31 (1).jpeg` },
  { id: 3, name: 'Sorrento Grey 3+2 Recliner', price: '£550', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.31 (2).jpeg` },
  { id: 4, name: 'Roma Brown 3+2 Recliner',    price: '£550', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.31 (3).jpeg` },
  { id: 5, name: 'Roma Grey 3+2 Recliner',     price: '£550', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.32.jpeg` },
];

const SOFAS_CORNER = [
  { id: 6,  name: 'Rio Cord Corner Recliner',      price: '£580', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.32 (1).jpeg` },
  { id: 7,  name: 'Roma Brown Corner Recliner',    price: '£580', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.32 (2).jpeg` },
  { id: 8,  name: 'Roma Black Corner Recliner',    price: '£580', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.32 (3).jpeg` },
  { id: 9,  name: 'Roma Grey Corner Recliner',     price: '£580', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.33.jpeg` },
  { id: 10, name: 'Sorrento Grey Corner Recliner', price: '£580', image: `${GITHUB_IMAGES}/WhatsApp Image 2026-06-09 at 20.55.33 (1).jpeg` },
];

const ALL_SOFAS = [...SOFAS_3_2, ...SOFAS_CORNER];

function buildSystemPrompt(source) {
  let adContext = '';
  if (source === 'ad') {
    adContext = `This customer messaged from your Facebook ad (they said 'Can I make a purchase?' or clicked your ad). Reply with: 'Of course! Here are all our sofas 😊' then use [SHOW_ALL] to send all 10 photos. After photos ask: 'Which one catches your eye?'`;
  } else {
    adContext = `This customer sent a direct message. Give a warm welcome and ask what type of sofa they are looking for.`;
  }

  return `You are a sales assistant for Comfy Sofa Ltd, a UK sofa business. Reply like a real human — warm, short, natural. No bullet points, no long messages, no bold text.

SOURCE: ${adContext}

FULL PRODUCT LIST:

3+2 RECLINER SETS — £550 each (manual recliners):
1. Roma Black 3+2 Recliner — black leather
2. Rio Cord Grey 3+2 Recliner — grey cord fabric, black leather sides
3. Sorrento Grey 3+2 Recliner — grey fabric, cup holders
4. Roma Brown 3+2 Recliner — brown leather, cup holders
5. Roma Grey 3+2 Recliner — grey leather, cup holders

CORNER RECLINERS — £580 each (manual recliners):
6. Rio Cord Corner Recliner — grey cord fabric, black leather sides
7. Roma Brown Corner Recliner — brown leather, cup holders
8. Roma Black Corner Recliner — black leather, cup holders
9. Roma Grey Corner Recliner — grey leather, cup holders
10. Sorrento Grey Corner Recliner — grey fabric, cup holders

DELIVERY: Free UK delivery, 2-4 working days, free assembly. We ring day before to confirm exact time. Specific day/date requests — yes that's fine.
PAYMENT: Cash on delivery only. Bank transfer if customer specifically asks.
WHATSAPP: ${WHATSAPP}

UNDERSTANDING CUSTOMER:
- "Roma" → ask which colour (Black, Grey or Brown)
- "Sorrento" → Sorrento Grey — ask 3+2 or corner
- "Rio" or "Rio Cord" → ask 3+2 or corner
- Customer says a number → match to product list above
- "3+2" or "3 and 2" → [SHOW_3_2]
- "corner" → [SHOW_CORNER]
- "all" → [SHOW_ALL]

PHOTO TRIGGERS:
[SHOW_3_2] → sends 3+2 photos
[SHOW_CORNER] → sends corner photos
[SHOW_ALL] → sends all 10 photos

AFTER PHOTOS: Follow with "Here are our options — which one catches your eye? 😊"

ORDER FLOW:
- When customer picks and seems ready → ask: "Would you like to place your order? 😊"
- If yes → reply EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"
- Once details received → "Perfect, thank you! Your order is confirmed. We'll be in touch to arrange your delivery 👍"

RULES:
- Max 2-3 sentences
- Sound like a real person texting
- Never mention any website
- One question at a time
- Natural emoji use`;
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else { res.sendStatus(403); }
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

  // Detect if message came from a Facebook ad
  if (!customerContext[senderId]) {
    const referral = event.referral || event.message?.referral;
    const hasRef = referral && referral.ref;
    const isAdMessage = hasRef || (referral && referral.source === 'ADS') || messageText.toLowerCase().includes('can i make a purchase') || messageText.toLowerCase().includes('make a purchase');
    customerContext[senderId] = isAdMessage ? 'ad' : 'direct';
    console.log(`Customer ${senderId} — source: ${customerContext[senderId]}`);
  }

  const source = customerContext[senderId];

  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: 'user', content: messageText });
  if (conversations[senderId].length > 20) {
    conversations[senderId] = conversations[senderId].slice(-20);
  }

  try {
    await sendTyping(senderId);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: buildSystemPrompt(source),
      messages: conversations[senderId]
    });

    let reply = response.content[0].text;

    // Send 3+2 photos
    if (reply.includes('[SHOW_3_2]')) {
      reply = reply.replace('[SHOW_3_2]', '').trim();
      for (const sofa of SOFAS_3_2) {
        await sendImage(senderId, sofa.image);
        await sleep(700);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    // Send corner photos
    if (reply.includes('[SHOW_CORNER]')) {
      reply = reply.replace('[SHOW_CORNER]', '').trim();
      for (const sofa of SOFAS_CORNER) {
        await sendImage(senderId, sofa.image);
        await sleep(700);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    // Send all 10 photos
    if (reply.includes('[SHOW_ALL]')) {
      reply = reply.replace('[SHOW_ALL]', '').trim();
      for (const sofa of ALL_SOFAS) {
        await sendImage(senderId, sofa.image);
        await sleep(700);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    conversations[senderId].push({ role: 'assistant', content: reply });
    if (reply) await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Hey sorry! Drop us a message on WhatsApp and we'll sort you right away — ${WHATSAPP} 👍`);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
