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

// ── Email via Resend ──────────────────────────────────────────────────────────
async function sendOrderEmail(orderDetails) {
  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: 'Nova Livings <onboarding@resend.dev>',
        to: 'thenasirkhan9@gmail.com',
        subject: '🛋️ New Order — Nova Livings',
        html: `
          <h2>New Order Received! 🛋️</h2>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p>
          <hr/>
          <h3>Customer Details:</h3>
          <pre style="font-size:15px; background:#f4f4f4; padding:15px; border-radius:8px;">${orderDetails}</pre>
          <hr/>
          <p style="color:#888;">Sent automatically by Nova Livings chatbot</p>
        `
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Order email sent successfully via Resend');
  } catch (e) {
    console.error('Email send error:', e.response?.data || e.message);
  }
}

// ── Live date/time helper ─────────────────────────────────────────────────────
function getLiveDateContext() {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const dayName = days[ukTime.getDay()];
  const date = ukTime.getDate();
  const month = months[ukTime.getMonth()];
  const year = ukTime.getFullYear();

  const tomorrow = new Date(ukTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowName = days[tomorrow.getDay()];
  const tomorrowDate = `${tomorrow.getDate()} ${months[tomorrow.getMonth()]}`;

  const dayAfter = new Date(ukTime);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterName = days[dayAfter.getDay()];
  const dayAfterDate = `${dayAfter.getDate()} ${months[dayAfter.getMonth()]}`;

  return `TODAY: ${dayName} ${date} ${month} ${year} (UK time)
TOMORROW: ${tomorrowName} ${tomorrowDate}
DAY AFTER TOMORROW: ${dayAfterName} ${dayAfterDate}`;
}

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
  // 3 Seaters
  { id: 11, name: 'Roma Black 3 Seater',    type: '3seater', price: 350, image: `${G}/romablack3.jpeg` },
  { id: 12, name: 'Roma Grey 3 Seater',     type: '3seater', price: 350, image: `${G}/romagrey3.jpeg` },
  { id: 13, name: 'Roma Brown 3 Seater',    type: '3seater', price: 350, image: `${G}/romabrown3.jpeg` },
  { id: 14, name: 'Rio Cord Grey 3 Seater', type: '3seater', price: 350, image: `${G}/rio3.jpeg` },
  { id: 15, name: 'Sorrento Grey 3 Seater', type: '3seater', price: 350, image: `${G}/sorrento3.jpeg` },
  // 2 Seaters
  { id: 16, name: 'Roma Black 2 Seater',    type: '2seater', price: 300, image: `${G}/romablack2.jpeg` },
  { id: 17, name: 'Roma Grey 2 Seater',     type: '2seater', price: 300, image: `${G}/romagrey2.jpeg` },
  { id: 18, name: 'Roma Brown 2 Seater',    type: '2seater', price: 300, image: `${G}/romabrown2.jpeg` },
  { id: 19, name: 'Rio Cord Grey 2 Seater', type: '2seater', price: 300, image: `${G}/rio2.jpeg` },
  { id: 20, name: 'Sorrento Grey 2 Seater', type: '2seater', price: 300, image: `${G}/sorrento2.jpeg` },
  // Chairs — photos coming soon
  { id: 21, name: 'Single Chair',           type: 'chair',   price: 220, image: null },
  // Sets
  { id: 22, name: '2+2 Recliner Set',       type: '2+2',     price: 500, image: null },
  { id: 23, name: '3+1 Recliner Set',       type: '3+1',     price: 520, image: null },
  { id: 24, name: '3+3 Recliner Set',       type: '3+3',     price: 620, image: null },
];

const ALL_SOFAS = [...SOFAS_3_2, ...SOFAS_CORNER, ...SOFAS_INDIVIDUAL];

// ── Greetings rotation ────────────────────────────────────────────────────────
const GREETINGS = [
  "Hey! 👋 Welcome to Nova Livings!",
  "Hi there! 😊 Thanks for reaching out to Nova Livings!",
  "Hello! Welcome to Nova Livings 😊",
  "Hey, great to hear from you! 👋",
  "Hi! Welcome to Nova Livings — lovely to have you here 😊"
];
function randomGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

// ── Compliments rotation ──────────────────────────────────────────────────────
const COMPLIMENTS = [
  "Great choice! 😊",
  "Lovely pick! That's one of our most popular! 😊",
  "Excellent taste! 👌",
  "Great taste — really popular one that! 😊",
  "Nice choice! You'll love it 😊"
];
function randomCompliment() {
  return COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
}

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

function isOrderConfirmed(text) {
  const lower = text.toLowerCase();
  return lower.includes("order is confirmed") || lower.includes("we'll be in touch to arrange delivery");
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a friendly sales assistant for Nova Livings, a UK sofa business.
Reply like a real human — warm, short, natural. No bullet points, no bold text, max 2-3 sentences per message.

${getLiveDateContext()}

━━━━━━━━━━━━━━━━━━━━━━━
PERSONALITY RULES — make it feel human:
- Vary your greetings — don't always say the same thing
- Compliment customer choices naturally e.g. "Great taste! That's one of our most popular 😊"
- Use customer's first name once you know it
- If customer says something is expensive, empathise: "I totally understand — it's a big purchase! But the quality is brilliant and delivery is completely free 😊"
- Split long info into 2-3 short messages rather than one big block
- Never sound robotic or scripted

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

INDIVIDUAL 3 SEATERS — £350 each (ALL have photos):
11. Roma Black 3 Seater    — black leather | 195W x 95D x 95H cm
12. Roma Grey 3 Seater     — grey leather  | 195W x 95D x 95H cm
13. Roma Brown 3 Seater    — brown leather | 195W x 95D x 95H cm
14. Rio Cord Grey 3 Seater — grey cord     | 195W x 95D x 95H cm
15. Sorrento Grey 3 Seater — grey fabric   | 195W x 95D x 95H cm

INDIVIDUAL 2 SEATERS — £300 each (ALL have photos):
16. Roma Black 2 Seater    — black leather | 145W x 95D x 95H cm
17. Roma Grey 2 Seater     — grey leather  | 145W x 95D x 95H cm
18. Roma Brown 2 Seater    — brown leather | 145W x 95D x 95H cm
19. Rio Cord Grey 2 Seater — grey cord     | 145W x 95D x 95H cm
20. Sorrento Grey 2 Seater — grey fabric   | 145W x 95D x 95H cm

SINGLE CHAIR — £220 (photo coming soon): 100W x 95D x 95H cm
OTHER SETS (no photos yet): 2+2 £500 | 3+1 £520 | 3+3 £620

━━━━━━━━━━━━━━━━━━━━━━━
PRICING COMBINATIONS — always add prices together instantly:
- Corner + Chair    = £800 | Corner + 2 Seater = £880 | Corner + 3 Seater = £930
- 3+2 + extra 2 Seater = £850 | 3+2 + extra 3 Seater = £900 | 3+2 + Chair = £770
- Any other combo: just add the prices together.
Say: "That'll be £[total] in total with free delivery 😊 Shall I go ahead with the order?"

━━━━━━━━━━━━━━━━━━━━━━━
DELIVERY RULES:
- Standard: free UK delivery, 2-4 working days, free assembly, ring day before with exact time.
- If customer asks for ANY specific day (tomorrow, Saturday, next Monday, day after tomorrow etc): ALWAYS say yes. Never lose an order over delivery date. Say: "Yes of course! We can do [day] 😊 We'll give you a ring beforehand to confirm the exact time."
- Never say no to a delivery date request.

PAYMENT: Cash on delivery. Bank transfer also accepted.
WHATSAPP: ${WHATSAPP}

━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION FLOW:

STEP 1 — FIRST MESSAGE:
If customer says "can i make a purchase", "interested", or comes from an ad:
→ [SHOW_ALL] then ask "Are you looking for a 3+2 set, a corner sofa, or individual pieces? 😊"

STEP 2 — CUSTOMER PICKS TYPE:
- "3+2" → [SHOW_3_2] then "Which one catches your eye? Pick by number or name 😊"
- "corner" → [SHOW_CORNER] then "Which one catches your eye? 😊"
- "3 seater" / "individual" / "separate" → [SHOW_3SEATERS] then "Which colour do you prefer? 😊"
- "2 seater" → [SHOW_2SEATERS] then "Which colour do you prefer? 😊"

STEP 3 — CUSTOMER PICKS SPECIFIC SOFA:
- IDs 1-20: ALWAYS use [SHOW_ID:X] — ALL have photos. NEVER say photo unavailable for these.
- IDs 21-24: text only, no photo.
- Then: "[Compliment]! The [name] is £[price] with free delivery 😊 Shall I go ahead and place your order?"

STEP 3b — PHOTO REQUEST:
If customer says "photo", "pic", "show me", "can I see it" → [SHOW_ID:X] for last sofa discussed. Always.

STEP 3c — EXTRA PIECES:
Customer adds extra → add prices → "That'll be £[total] in total 😊 Shall I go ahead?"

STEP 4 — ORDER COLLECTION:
→ Reply EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"

STEP 5 — ORDER CONFIRMED:
→ Reply EXACTLY: "Perfect! Your order is confirmed. We'll be in touch to arrange delivery. Thank you for choosing Nova Livings! 👍"

━━━━━━━━━━━━━━━━━━━━━━━
PHOTO TRIGGERS:
[SHOW_ALL]      = all 10 set/corner photos (IDs 1-10)
[SHOW_3_2]      = 5 three+two set photos (IDs 1-5)
[SHOW_CORNER]   = 5 corner photos (IDs 6-10)
[SHOW_3SEATERS] = 5 individual 3 seater photos (IDs 11-15)
[SHOW_2SEATERS] = 5 individual 2 seater photos (IDs 16-20)
[SHOW_ID:X]     = single photo for sofa X

━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES:
- IDs 1-20 ALL have photos. ALWAYS use [SHOW_ID:X]. NEVER say unavailable for 1-20.
- IDs 21-24 no photos yet.
- Never re-send group photos after customer picked a specific sofa.
- Always say YES to any delivery date.
- If customer says price is too much, empathise and mention free delivery + quality.
- Use customer name once you know it.`;
}

// ── Webhook ───────────────────────────────────────────────────────────────────
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

const conversations = {};

async function handleMessage(event) {
  const senderId = event.sender.id;
  const messageText = event.message?.text;
  if (!messageText) return;

  cancelReminder(senderId);

  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: 'user', content: messageText });
  if (conversations[senderId].length > 30) {
    conversations[senderId] = conversations[senderId].slice(-30);
  }

  if (checkHesitation(messageText)) {
    scheduleReminder(senderId);
  }

  try {
    await sendTyping(senderId);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: buildSystemPrompt(),
      messages: conversations[senderId]
    });

    let reply = response.content[0].text;

    // ── [SHOW_ALL] ────────────────────────────────────────────────────────
    if (reply.includes('[SHOW_ALL]')) {
      reply = reply.replace('[SHOW_ALL]', '').trim();
      for (const sofa of [...SOFAS_3_2, ...SOFAS_CORNER]) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }
    // ── [SHOW_3_2] ────────────────────────────────────────────────────────
    else if (reply.includes('[SHOW_3_2]')) {
      reply = reply.replace('[SHOW_3_2]', '').trim();
      for (const sofa of SOFAS_3_2) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }
    // ── [SHOW_CORNER] ─────────────────────────────────────────────────────
    else if (reply.includes('[SHOW_CORNER]')) {
      reply = reply.replace('[SHOW_CORNER]', '').trim();
      for (const sofa of SOFAS_CORNER) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }
    // ── [SHOW_3SEATERS] ───────────────────────────────────────────────────
    else if (reply.includes('[SHOW_3SEATERS]')) {
      reply = reply.replace('[SHOW_3SEATERS]', '').trim();
      const threeSeaters = SOFAS_INDIVIDUAL.filter(s => s.type === '3seater');
      for (const sofa of threeSeaters) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }
    // ── [SHOW_2SEATERS] ───────────────────────────────────────────────────
    else if (reply.includes('[SHOW_2SEATERS]')) {
      reply = reply.replace('[SHOW_2SEATERS]', '').trim();
      const twoSeaters = SOFAS_INDIVIDUAL.filter(s => s.type === '2seater');
      for (const sofa of twoSeaters) {
        await sendImage(senderId, sofa.image);
        await sleep(600);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — £${sofa.price}`);
        await sleep(400);
      }
    }

    // ── [SHOW_ID:X] ───────────────────────────────────────────────────────
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

    conversations[senderId].push({ role: 'assistant', content: reply });
    if (reply) await sendMessage(senderId, reply);

    // ── Order email ───────────────────────────────────────────────────────
    if (isOrderConfirmed(reply)) {
      const recentMessages = conversations[senderId].slice(-6);
      const orderDetails = recentMessages
        .map(m => `${m.role === 'user' ? 'Customer' : 'Bot'}: ${m.content}`)
        .join('\n');
      await sendOrderEmail(orderDetails);
      console.log(`Order confirmed for ${senderId} — email sent`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Sorry about that! Message us directly on WhatsApp and we'll sort you out — ${WHATSAPP} 👍`);
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
