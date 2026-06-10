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

// ── Products ──────────────────────────────────────────────────────────────────

const SOFAS_3_2 = [
  { id: 1,  name: 'Roma Black 3+2 Recliner',    colour: 'black', price: 550, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(1).jpeg` },
  { id: 2,  name: 'Roma Grey 3+2 Recliner',     colour: 'grey',  price: 550, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31.jpeg` },
  { id: 3,  name: 'Roma Brown 3+2 Recliner',    colour: 'brown', price: 550, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(2).jpeg` },
  { id: 4,  name: 'Rio Cord Grey 3+2 Recliner', colour: 'grey',  price: 550, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(3).jpeg` },
  { id: 5,  name: 'Sorrento Grey 3+2 Recliner', colour: 'grey',  price: 550, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32.jpeg` },
];

const SOFAS_CORNER = [
  { id: 6,  name: 'Roma Brown Corner Recliner',    colour: 'brown', price: 580, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(1).jpeg` },
  { id: 7,  name: 'Sorrento Grey Corner Recliner', colour: 'grey',  price: 580, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(2).jpeg` },
  { id: 8,  name: 'Roma Grey Corner Recliner',     colour: 'grey',  price: 580, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(3).jpeg` },
  { id: 9,  name: 'Rio Cord Corner Recliner',      colour: 'grey',  price: 580, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.33.jpeg` },
  { id: 10, name: 'Roma Black Corner Recliner',    colour: 'black', price: 580, image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.33%20(1).jpeg` },
];

const SOFAS_INDIVIDUAL = [
  { id: 11, name: '3 Seater Recliner',  type: '3seater', price: 350, image: null },
  { id: 12, name: '2 Seater Recliner',  type: '2seater', price: 300, image: null },
  { id: 13, name: 'Single Chair',       type: 'chair',   price: 220, image: null },
  { id: 14, name: '2+2 Recliner Set',   type: '2+2',     price: 500, image: null },
  { id: 15, name: '3+1 Recliner Set',   type: '3+1',     price: 520, image: null },
  { id: 16, name: '3+3 Recliner Set',   type: '3+3',     price: 620, image: null },
];

const ALL_SOFAS = [...SOFAS_3_2, ...SOFAS_CORNER, ...SOFAS_INDIVIDUAL];

// ── 24-hour reminder system ───────────────────────────────────────────────────
const reminderTimers = {};

const HESITATION_PHRASES = [
  "i'll get back to you", "ill get back to you",
  "let me think", "i'll think about it", "ill think about it",
  "i'll check with my wife", "i'll check with my husband", "i'll check with my partner",
  "ill check with my wife", "ill check with my husband", "ill check with my partner",
  "maybe later", "not sure yet",
  "i'll decide later", "ill decide later",
  "let me check", "i'll come back to you", "ill come back to you",
  "i'll message you later", "ill message you later",
  "busy right now", "i'm busy"
];

const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;

function checkHesitation(text) {
  const lower = text.toLowerCase();
  return HESITATION_PHRASES.some(phrase => lower.includes(phrase));
}

function scheduleReminder(senderId) {
  if (reminderTimers[senderId]) clearTimeout(reminderTimers[senderId]);
  reminderTimers[senderId] = setTimeout(async () => {
    console.log(`Sending 24hr reminder to ${senderId}`);
    await sendMessage(senderId,
      `Hey! 👋 Just checking in — are you still interested in the sofa? We'd love to help you find the perfect one. Feel free to ask any questions 😊`
    );
    delete reminderTimers[senderId];
  }, REMINDER_DELAY_MS);
  console.log(`Reminder scheduled for ${senderId} in 24 hours`);
}

function cancelReminder(senderId) {
  if (reminderTimers[senderId]) {
    clearTimeout(reminderTimers[senderId]);
    delete reminderTimers[senderId];
    console.log(`Reminder cancelled for ${senderId} — customer came back`);
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a friendly sales assistant for Nova Livings, a UK sofa business.
Reply like a real human — warm, short, natural. No bullet points, no bold text, max 2-3 sentences.

━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTS & PRICES:

3+2 RECLINER SETS — £550 each (ALL have photos):
1. Roma Black 3+2     — black leather, cup holders | 3 seater: 195W x 95D x 95H cm | 2 seater: 145W x 95D x 95H cm
2. Roma Grey 3+2      — grey leather, cup holders  | 3 seater: 195W x 95D x 95H cm | 2 seater: 145W x 95D x 95H cm
3. Roma Brown 3+2     — brown leather, cup holders | 3 seater: 195W x 95D x 95H cm | 2 seater: 145W x 95D x 95H cm
4. Rio Cord Grey 3+2  — grey cord fabric            | 3 seater: 195W x 95D x 95H cm | 2 seater: 145W x 95D x 95H cm
5. Sorrento Grey 3+2  — grey fabric, cup holders   | 3 seater: 195W x 95D x 95H cm | 2 seater: 145W x 95D x 95H cm

CORNER RECLINERS — £580 each (ALL have photos):
6.  Roma Brown Corner    — brown leather, cup holders | 230 x 230 cm, 95D x 95H cm
7.  Sorrento Grey Corner — grey fabric, cup holders   | 230 x 230 cm, 95D x 95H cm
8.  Roma Grey Corner     — grey leather, cup holders  | 230 x 230 cm, 95D x 95H cm
9.  Rio Cord Corner      — grey cord fabric            | 230 x 230 cm, 95D x 95H cm
10. Roma Black Corner    — black leather, cup holders | 230 x 230 cm, 95D x 95H cm

INDIVIDUAL PIECES — no photos yet, text only:
11. 3 Seater Recliner  — £350
12. 2 Seater Recliner  — £300
13. Single Chair        — £220
14. 2+2 Recliner Set   — £500
15. 3+1 Recliner Set   — £520
16. 3+3 Recliner Set   — £620

━━━━━━━━━━━━━━━━━━━━━━━
PRICING COMBINATIONS — always add prices together:
- Corner + Single Chair    = £580 + £220 = £800
- Corner + 2 Seater        = £580 + £300 = £880
- Corner + 3 Seater        = £580 + £350 = £930
- 3+2 Set + extra 2 Seater = £550 + £300 = £850
- 3+2 Set + extra 3 Seater = £550 + £350 = £900
- 3+2 Set + extra Chair    = £550 + £220 = £770
- Any other combination: simply add the individual prices together.

When customer asks for a combination, calculate the total immediately and say:
"That'll be £[total] in total with free delivery 😊 Shall I go ahead with the order?"

━━━━━━━━━━━━━━━━━━━━━━━
DELIVERY: Free UK delivery, 2-4 working days, free assembly included. We ring the day before with an exact time. Customer can request a specific day/date.
PAYMENT: Cash on delivery. Bank transfer also accepted if customer asks.
WHATSAPP: ${WHATSAPP}

━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION FLOW — follow this EXACTLY:

STEP 1 — FIRST MESSAGE / AD ARRIVAL:
If customer says "can i make a purchase", "interested", or comes from an ad:
→ Reply: [SHOW_ALL] then ask "Are you looking for a 3+2 set, a corner sofa, or individual pieces? 😊"

STEP 2 — CUSTOMER PICKS TYPE:
If customer says "3+2"        → Reply: [SHOW_3_2] then ask "Which one catches your eye? You can pick by number or name 😊"
If customer says "corner"     → Reply: [SHOW_CORNER] then ask "Which one catches your eye? You can pick by number or name 😊"
If customer says "individual" or asks about single pieces → list individual pieces with prices, ask what they need.

STEP 3 — CUSTOMER PICKS A SPECIFIC SOFA:
Once customer mentions a specific sofa (e.g. "black corner", "number 10", "Rio Cord", "brown one", "number 4"):
→ If ID is 1-10: ALWAYS send the photo using [SHOW_ID:X]. NEVER say the photo is unavailable. ALL IDs 1-10 have photos.
→ If ID is 11-16: confirm name and price in text only, no photo trigger.
→ Then confirm: "Great choice! The [name] is £[price] with free delivery 😊 Shall I go ahead and place your order?"
→ Do NOT send group photos again at this point.

STEP 3b — CUSTOMER ASKS FOR PHOTO MID-CONVERSATION:
If customer says "photo", "photo?", "send photo", "can I see it", "show me", "pic", "picture", "image" or any similar request:
→ Look at the conversation history to find the last sofa being discussed.
→ ALWAYS send [SHOW_ID:X] for that sofa immediately. Never reply with text only.
→ Example: if last sofa discussed was Roma Black Corner (ID 10), reply with [SHOW_ID:10]

STEP 3c — CUSTOMER ADDS EXTRA PIECES:
If customer wants to add an extra piece to their order (e.g. "and a 2 seater", "plus a chair"):
→ Add the prices together immediately.
→ Say: "That'll be £[total] in total with free delivery 😊 Shall I go ahead with the order?"

STEP 4 — ORDER COLLECTION:
If customer says yes / ready to order:
→ Reply EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"

STEP 5 — ORDER CONFIRMED:
Once customer provides their details:
→ Reply: "Perfect! Your order is confirmed. We'll be in touch to arrange delivery. Thank you for choosing Nova Livings! 👍"

━━━━━━━━━━━━━━━━━━━━━━━
PHOTO TRIGGER REFERENCE:
[SHOW_ALL]    = sends all 10 sofa photos (IDs 1-10)
[SHOW_3_2]    = sends the 5 three+two photos (IDs 1-5)
[SHOW_CORNER] = sends the 5 corner photos (IDs 6-10)
[SHOW_ID:X]   = sends ONLY the photo for sofa number X

━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES:
- IDs 1-10 ALL have photos. ALWAYS use [SHOW_ID:X] for any of these. NEVER say "photos not available" or "photos coming soon" for IDs 1-10. This includes Rio Cord (IDs 4 and 9).
- ONLY IDs 11-16 have no photos. Never use photo triggers for these.
- If customer says "photo", "pic", "show me", "can I see it" or anything similar — always send [SHOW_ID:X] for the last sofa discussed. Never reply with text only when a photo is requested.
- Never send group photos again after customer has picked a specific sofa.
- If customer asks about delivery, price, payment or dimensions mid-flow, answer briefly then return to the flow.
- If unsure which sofa they mean, ask one clarifying question only.`;
}

// ── Webhook verification ──────────────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// ── Incoming messages ─────────────────────────────────────────────────────────
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

  // Customer replied — cancel any pending reminder
  cancelReminder(senderId);

  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: 'user', content: messageText });
  if (conversations[senderId].length > 30) {
    conversations[senderId] = conversations[senderId].slice(-30);
  }

  // Check hesitation phrases → schedule 24hr reminder
  if (checkHesitation(messageText)) {
    scheduleReminder(senderId);
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

    // ── Handle [SHOW_ALL] ─────────────────────────────────────────────────
    if (reply.includes('[SHOW_ALL]')) {
      reply = reply.replace('[SHOW_ALL]', '').trim();
      for (const sofa of [...SOFAS_3_2, ...SOFAS_CORNER]) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Handle [SHOW_3_2] ─────────────────────────────────────────────────
    else if (reply.includes('[SHOW_3_2]')) {
      reply = reply.replace('[SHOW_3_2]', '').trim();
      for (const sofa of SOFAS_3_2) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Handle [SHOW_CORNER] ──────────────────────────────────────────────
    else if (reply.includes('[SHOW_CORNER]')) {
      reply = reply.replace('[SHOW_CORNER]', '').trim();
      for (const sofa of SOFAS_CORNER) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Handle [SHOW_ID:X] — sends ONE specific sofa ──────────────────────
    const showIdMatch = reply.match(/\[SHOW_ID:(\d+)\]/);
    if (showIdMatch) {
      const sofaId = parseInt(showIdMatch[1]);
      const sofa = ALL_SOFAS.find(s => s.id === sofaId);
      reply = reply.replace(/\[SHOW_ID:\d+\]/, '').trim();
      if (sofa && sofa.image) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }

    // ── Send the text reply ───────────────────────────────────────────────
    conversations[senderId].push({ role: 'assistant', content: reply });
    if (reply) await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Sorry about that! Message us directly on WhatsApp and we'll sort you out straight away — ${WHATSAPP} 👍`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
