const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP = '+447888368461';

const G = 'https://raw.githubusercontent.com/callmeansir/nova-livings-chatbot/main/images';

const SOFAS_3_2 = [
  { id: 1, name: 'Roma Black 3+2 Recliner',   colour: 'black',  price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(1).jpeg` },
  { id: 2, name: 'Roma Grey 3+2 Recliner',    colour: 'grey',   price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31.jpeg` },
  { id: 3, name: 'Roma Brown 3+2 Recliner',   colour: 'brown',  price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(2).jpeg` },
  { id: 4, name: 'Rio Cord Grey 3+2 Recliner',colour: 'grey',   price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(3).jpeg` },
  { id: 5, name: 'Sorrento Grey 3+2 Recliner',colour: 'grey',   price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32.jpeg` },
];

const SOFAS_CORNER = [
  { id: 6,  name: 'Roma Brown Corner Recliner',   colour: 'brown', price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(1).jpeg` },
  { id: 7,  name: 'Sorrento Grey Corner Recliner',colour: 'grey',  price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(2).jpeg` },
  { id: 8,  name: 'Roma Grey Corner Recliner',    colour: 'grey',  price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(3).jpeg` },
  { id: 9,  name: 'Rio Cord Corner Recliner',     colour: 'grey',  price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.33.jpeg` },
  { id: 10, name: 'Roma Black Corner Recliner',   colour: 'black', price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.33%20(1).jpeg` },
];

const ALL_SOFAS = [...SOFAS_3_2, ...SOFAS_CORNER];

// ── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a friendly sales assistant for Nova Livings, a UK sofa business.
Reply like a real human — warm, short, natural. No bullet points, no bold text, max 2-3 sentences.

PRODUCTS:
3+2 RECLINER SETS — £550 (manual recliners, free UK delivery):
1. Roma Black 3+2     — black leather, cup holders
2. Roma Grey 3+2      — grey leather, cup holders
3. Roma Brown 3+2     — brown leather, cup holders
4. Rio Cord Grey 3+2  — grey cord fabric
5. Sorrento Grey 3+2  — grey fabric, cup holders

CORNER RECLINERS — £580 (manual recliners, free UK delivery):
6.  Roma Brown Corner    — brown leather, cup holders
7.  Sorrento Grey Corner — grey fabric, cup holders
8.  Roma Grey Corner     — grey leather, cup holders
9.  Rio Cord Corner      — grey cord fabric
10. Roma Black Corner    — black leather, cup holders

DELIVERY: Free UK delivery, 2-4 working days, free assembly included. We ring the day before with an exact time. Customer can request a specific day/date.
PAYMENT: Cash on delivery. Bank transfer also accepted if customer asks.
WHATSAPP: ${WHATSAPP}

━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION FLOW — follow this EXACTLY:

STEP 1 — FIRST MESSAGE / AD ARRIVAL:
If customer says "can i make a purchase", "interested", or comes from an ad:
→ Reply: [SHOW_ALL] then ask "Are you looking for a 3+2 set or a corner sofa? 😊"

STEP 2 — CUSTOMER PICKS TYPE:
If customer says "3+2" → Reply: [SHOW_3_2] then ask "Which one catches your eye? You can pick by number or name 😊"
If customer says "corner" → Reply: [SHOW_CORNER] then ask "Which one catches your eye? You can pick by number or name 😊"

STEP 3 — CUSTOMER PICKS A SPECIFIC SOFA:
Once customer mentions a specific sofa (e.g. "black corner", "number 10", "Roma Grey 3+2", "brown one"):
→ Send ONLY that one sofa's photo using [SHOW_ID:X] where X is the product number.
→ Then confirm: "Great choice! The [name] is [price] with free delivery 😊 Shall I go ahead and place your order?"
→ Do NOT send group photos again at this point.

STEP 4 — ORDER COLLECTION:
If customer says yes / ready to order:
→ Reply EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"

STEP 5 — ORDER CONFIRMED:
Once customer provides their details:
→ Reply: "Perfect! Your order is confirmed. We'll be in touch to arrange delivery. Thank you for choosing Nova Livings! 👍"

━━━━━━━━━━━━━━━━━━━━━━━
PHOTO TRIGGER REFERENCE (use in your reply text):
[SHOW_ALL]    = sends all 10 sofa photos
[SHOW_3_2]    = sends the 5 three+two photos
[SHOW_CORNER] = sends the 5 corner photos
[SHOW_ID:X]   = sends ONLY the photo for sofa number X (1–10)

IMPORTANT RULES:
- Never send group photos again after customer has picked a specific sofa.
- If customer asks about delivery, price, or payment mid-flow, answer briefly then return to the flow.
- If unsure which sofa they mean, ask one clarifying question only.
- Always use [SHOW_ID:X] for a specific sofa, never re-send [SHOW_ALL] or [SHOW_CORNER] etc. at that point.`;
}

// ── Webhook verification ─────────────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// ── Incoming messages ────────────────────────────────────────────────────────
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

const conversations = {};

async function handleMessage(event) {
  const senderId = event.sender.id;
  const messageText = event.message?.text;
  if (!messageText) return;

  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: 'user', content: messageText });
  if (conversations[senderId].length > 30) {
    conversations[senderId] = conversations[senderId].slice(-30);
  }

  try {
    await sendTyping(senderId);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: buildSystemPrompt(),
      messages: conversations[senderId]
    });

    let reply = response.content[0].text;

    // ── Handle [SHOW_ALL] ──────────────────────────────────────────────────
    if (reply.includes('[SHOW_ALL]')) {
      reply = reply.replace('[SHOW_ALL]', '').trim();
      for (const sofa of ALL_SOFAS) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Handle [SHOW_3_2] ──────────────────────────────────────────────────
    else if (reply.includes('[SHOW_3_2]')) {
      reply = reply.replace('[SHOW_3_2]', '').trim();
      for (const sofa of SOFAS_3_2) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Handle [SHOW_CORNER] ───────────────────────────────────────────────
    else if (reply.includes('[SHOW_CORNER]')) {
      reply = reply.replace('[SHOW_CORNER]', '').trim();
      for (const sofa of SOFAS_CORNER) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Handle [SHOW_ID:X] — sends ONE specific sofa ───────────────────────
    const showIdMatch = reply.match(/\[SHOW_ID:(\d+)\]/);
    if (showIdMatch) {
      const sofaId = parseInt(showIdMatch[1]);
      const sofa = ALL_SOFAS.find(s => s.id === sofaId);
      reply = reply.replace(/\[SHOW_ID:\d+\]/, '').trim();
      if (sofa) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Send the text reply ────────────────────────────────────────────────
    conversations[senderId].push({ role: 'assistant', content: reply });
    if (reply) await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Sorry about that! Message us directly on WhatsApp and we'll sort you out straight away — ${WHATSAPP} 👍`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendMessage(recipientId, text) {
  try {
    await axios.post(
      'https://graph.facebook.com/v18.0/me/messages',
      { recipient: { id: recipientId }, message: { text } },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (e) { console.error('sendMessage error:', e.message); }
}

async function sendImage(recipientId, imageUrl) {
  try {
    await axios.post(
      'https://graph.facebook.com/v18.0/me/messages',
      { recipient: { id: recipientId }, message: { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } } },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (e) { console.error('sendImage error:', e.message); }
}

async function sendTyping(recipientId) {
  await axios.post(
    'https://graph.facebook.com/v18.0/me/messages',
    { recipient: { id: recipientId }, sender_action: 'typing_on' },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  ).catch(() => {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nova Livings chatbot running on port ${PORT}`));
