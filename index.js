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

// ── ALL 10 SOFAS WITH EXACT NAMES FROM AD PHOTOS ──
const SOFAS_3_2 = [
  { id: 1, name: 'Roma Black 3+2 Recliner',    price: '£550', colour: 'Black', material: 'leather',      image: `${GITHUB_IMAGES}/roma-black-3-2.jpg` },
  { id: 2, name: 'Rio Cord Grey 3+2 Recliner', price: '£550', colour: 'Grey',  material: 'cord fabric',   image: `${GITHUB_IMAGES}/rio-cord-3-2.jpg` },
  { id: 3, name: 'Sorrento Grey 3+2 Recliner', price: '£550', colour: 'Grey',  material: 'fabric',        image: `${GITHUB_IMAGES}/sorrento-grey-3-2.jpg` },
  { id: 4, name: 'Roma Brown 3+2 Recliner',    price: '£550', colour: 'Brown', material: 'leather',       image: `${GITHUB_IMAGES}/roma-brown-3-2.jpg` },
  { id: 5, name: 'Roma Grey 3+2 Recliner',     price: '£550', colour: 'Grey',  material: 'leather',       image: `${GITHUB_IMAGES}/roma-grey-3-2.jpg` },
];

const SOFAS_CORNER = [
  { id: 6, name: 'Rio Cord Corner Recliner',      price: '£580', colour: 'Grey',  material: 'cord fabric', image: `${GITHUB_IMAGES}/rio-cord-corner.jpg` },
  { id: 7, name: 'Roma Brown Corner Recliner',    price: '£580', colour: 'Brown', material: 'leather',     image: `${GITHUB_IMAGES}/roma-brown-corner.jpg` },
  { id: 8, name: 'Roma Black Corner Recliner',    price: '£580', colour: 'Black', material: 'leather',     image: `${GITHUB_IMAGES}/roma-black-corner.jpg` },
  { id: 9, name: 'Roma Grey Corner Recliner',     price: '£580', colour: 'Grey',  material: 'leather',     image: `${GITHUB_IMAGES}/roma-grey-corner.jpg` },
  { id: 10, name: 'Sorrento Grey Corner Recliner', price: '£580', colour: 'Grey', material: 'fabric',      image: `${GITHUB_IMAGES}/sorrento-grey-corner.jpg` },
];

const ALL_SOFAS = [...SOFAS_3_2, ...SOFAS_CORNER];

const SYSTEM_PROMPT = `You are a sales assistant for Comfy Sofa Ltd, a UK sofa business. Reply like a real human — warm, short, natural. No bullet points, no long messages, no bold text.

FULL PRODUCT LIST:

3+2 RECLINER SETS — £550 each (all manual recliners, 3 seater + 2 seater):
1. Roma Black 3+2 Recliner — black leather
2. Rio Cord Grey 3+2 Recliner — grey cord fabric with black leather sides
3. Sorrento Grey 3+2 Recliner — grey fabric with cup holders
4. Roma Brown 3+2 Recliner — brown leather with cup holders
5. Roma Grey 3+2 Recliner — grey leather with cup holders

CORNER RECLINERS — £580 each (all manual recliners):
6. Rio Cord Corner Recliner — grey cord fabric with black leather sides
7. Roma Brown Corner Recliner — brown leather with cup holders
8. Roma Black Corner Recliner — black leather with cup holders
9. Roma Grey Corner Recliner — grey leather with cup holders
10. Sorrento Grey Corner Recliner — grey fabric with cup holders

DELIVERY: Free UK delivery, 2-4 working days, free assembly included. We ring day before to confirm exact time. Specific day/date requests — yes that's fine.
PAYMENT: Cash on delivery only. Bank transfer available if customer specifically asks.
WHATSAPP: ${WHATSAPP}

UNDERSTANDING CUSTOMER REQUESTS:
- If customer says "Roma" → could be Roma Black, Roma Grey or Roma Brown — ask which colour
- If customer says "Sorrento" → Sorrento Grey (3+2 or corner — ask which)
- If customer says "Rio" or "Rio Cord" → Rio Cord (3+2 or corner — ask which)
- If customer says "3+2" or "3 and 2" → show [SHOW_3_2]
- If customer says "corner" → show [SHOW_CORNER]
- If customer mentions a colour like "grey" → show relevant grey options
- If customer says a number like "number 3" → that's Sorrento Grey 3+2

PHOTO TRIGGERS — use these in your reply:
- [SHOW_3_2] → sends all 5 three+two recliner photos with names
- [SHOW_CORNER] → sends all 5 corner recliner photos with names
- [SHOW_ALL] → sends all 10 photos

AFTER SENDING PHOTOS:
Always follow up with: "Here are our options — which one do you like? 😊"

ORDER FLOW:
- When customer picks a sofa and seems ready → ask: "Would you like to place your order? 😊"
- If yes → reply EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"
- Once they give details → say: "Perfect, thank you! Your order is confirmed. We'll be in touch to arrange your delivery date 👍"

RULES:
- Max 2-3 sentences per reply
- Sound like a real person texting
- Never mention any website
- One question at a time
- Use occasional emoji but keep it natural`;

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
      system: SYSTEM_PROMPT,
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
        await sleep(500);
      }
    }

    // Send corner photos
    if (reply.includes('[SHOW_CORNER]')) {
      reply = reply.replace('[SHOW_CORNER]', '').trim();
      for (const sofa of SOFAS_CORNER) {
        await sendImage(senderId, sofa.image);
        await sleep(700);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(500);
      }
    }

    // Send all photos
    if (reply.includes('[SHOW_ALL]')) {
      reply = reply.replace('[SHOW_ALL]', '').trim();
      for (const sofa of ALL_SOFAS) {
        await sendImage(senderId, sofa.image);
        await sleep(700);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(500);
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
