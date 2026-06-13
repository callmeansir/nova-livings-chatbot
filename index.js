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

  const suggested = new Date(ukTime);
  suggested.setDate(suggested.getDate() + 2);
  const suggestedName = days[suggested.getDay()];
  const suggestedDate = `${suggested.getDate()} ${months[suggested.getMonth()]}`;

  return `TODAY: ${dayName} ${date} ${month} ${year} (UK time)
TOMORROW: ${tomorrowName} ${tomorrowDate}
DAY AFTER TOMORROW: ${dayAfterName} ${dayAfterDate}
SUGGESTED ASAP DELIVERY DATE: ${suggestedName} ${suggestedDate} ${year} (use this when customer says asap)`;
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
  { id: 11, name: 'Roma Black 3 Seater',    type: '3seater', colour: 'black', price: 350, image: `${G}/romablack3.jpeg` },
  { id: 12, name: 'Roma Grey 3 Seater',     type: '3seater', colour: 'grey',  price: 350, image: `${G}/romagrey3.jpeg` },
  { id: 13, name: 'Roma Brown 3 Seater',    type: '3seater', colour: 'brown', price: 350, image: `${G}/romabrown3.jpeg` },
  { id: 14, name: 'Rio Cord Grey 3 Seater', type: '3seater', colour: 'grey',  price: 350, image: `${G}/rio3.jpeg` },
  { id: 15, name: 'Sorrento Grey 3 Seater', type: '3seater', colour: 'grey',  price: 350, image: `${G}/sorrento3.jpeg` },
  // 2 Seaters
  { id: 16, name: 'Roma Black 2 Seater',    type: '2seater', colour: 'black', price: 300, image: `${G}/romablack2.jpeg` },
  { id: 17, name: 'Roma Grey 2 Seater',     type: '2seater', colour: 'grey',  price: 300, image: `${G}/romagrey2.jpeg` },
  { id: 18, name: 'Roma Brown 2 Seater',    type: '2seater', colour: 'brown', price: 300, image: `${G}/romabrown2.jpeg` },
  { id: 19, name: 'Rio Cord Grey 2 Seater', type: '2seater', colour: 'grey',  price: 300, image: `${G}/rio2.jpeg` },
  { id: 20, name: 'Sorrento Grey 2 Seater', type: '2seater', colour: 'grey',  price: 300, image: `${G}/sorrento2.jpeg` },
  // Chairs
  { id: 21, name: 'Roma Black Chair',    type: 'chair', colour: 'black', price: 220, image: `${G}/romablackchair.jpeg` },
  { id: 22, name: 'Roma Grey Chair',     type: 'chair', colour: 'grey',  price: 220, image: `${G}/romagreychair.jpeg` },
  { id: 23, name: 'Roma Brown Chair',    type: 'chair', colour: 'brown', price: 220, image: `${G}/romabrownchair.jpeg` },
  { id: 24, name: 'Rio Cord Grey Chair', type: 'chair', colour: 'grey',  price: 220, image: `${G}/cordchair.jpeg` },
  { id: 25, name: 'Sorrento Grey Chair', type: 'chair', colour: 'grey',  price: 220, image: `${G}/sorrentochair.jpeg` },
  // Sets
  { id: 26, name: '2+2 Recliner Set',   type: '2+2',   colour: null,    price: 500, image: null },
  { id: 27, name: '3+1 Recliner Set',   type: '3+1',   colour: null,    price: 520, image: null },
  { id: 28, name: '3+3 Recliner Set',   type: '3+3',   colour: null,    price: 620, image: null },
];

const ALL_SOFAS = [...SOFAS_3_2, ...SOFAS_CORNER, ...SOFAS_INDIVIDUAL];

// ── Helper: find matching 3 seater or 2 seater by colour ─────────────────────
function findMatchingIndividual(type, colour) {
  return SOFAS_INDIVIDUAL.find(s => s.type === type && (!colour || s.colour === colour));
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
}

function cancelReminder(senderId) {
  if (reminderTimers[senderId]) {
    clearTimeout(reminderTimers[senderId]);
    delete reminderTimers[senderId];
  }
}

function isOrderConfirmed(text) {
  const lower = text.toLowerCase();
  return lower.includes("order is confirmed") || lower.includes("we'll be in touch to arrange delivery");
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are a friendly sales assistant for Nova Livings, a UK sofa business.
Reply like a real human texting a friend — warm, short, casual. Max 1-2 short sentences per message. If you need to say more, split into separate short messages using the [SPLIT] tag between them. Never write long paragraphs. Keep it punchy and natural.

${getLiveDateContext()}

━━━━━━━━━━━━━━━━━━━━━━━
PERSONALITY RULES:
- Vary your greetings — don't always say the same thing
- Compliment customer choices naturally e.g. "Great taste! That's one of our most popular 😊"
- Use customer's first name once you know it
- If customer says something is expensive, empathise: "I totally understand — it's a big purchase! But the quality is brilliant and delivery is completely free 😊"
- Never sound robotic or scripted

━━━━━━━━━━━━━━━━━━━━━━━
PRODUCTS & PRICES:

3+2 RECLINER SETS — £550 (ALL have photos, IDs 1-5):
1. Roma Black 3+2 — black LEATHER | 2. Roma Grey 3+2 — grey LEATHER | 3. Roma Brown 3+2 — brown LEATHER | 4. Rio Cord Grey 3+2 — grey CORD fabric | 5. Sorrento Grey 3+2 — grey FABRIC
Dimensions: 3 seater 195W x 95D x 95H cm | 2 seater 145W x 95D x 95H cm

CORNER RECLINERS — £580 (ALL have photos, IDs 6-10):
6. Roma Brown Corner — brown LEATHER | 7. Sorrento Grey Corner — grey FABRIC | 8. Roma Grey Corner — grey LEATHER | 9. Rio Cord Corner — grey CORD fabric | 10. Roma Black Corner — black LEATHER
Dimensions: 230 x 230 cm, 95D x 95H cm

INDIVIDUAL 3 SEATERS — £350 (ALL have photos, IDs 11-15):
11. Roma Black 3 Seater — black LEATHER | 12. Roma Grey 3 Seater — grey LEATHER | 13. Roma Brown 3 Seater — brown LEATHER | 14. Rio Cord Grey 3 Seater — grey CORD fabric | 15. Sorrento Grey 3 Seater — grey FABRIC
Dimensions: 195W x 95D x 95H cm

INDIVIDUAL 2 SEATERS — £300 (ALL have photos, IDs 16-20):
16. Roma Black 2 Seater — black LEATHER | 17. Roma Grey 2 Seater — grey LEATHER | 18. Roma Brown 2 Seater — brown LEATHER | 19. Rio Cord Grey 2 Seater — grey CORD fabric | 20. Sorrento Grey 2 Seater — grey FABRIC
Dimensions: 145W x 95D x 95H cm

SINGLE CHAIRS — £220 each (ALL have photos, IDs 21-25) | 100W x 95D x 95H cm:
21. Roma Black Chair — black leather | 22. Roma Grey Chair — grey leather | 23. Roma Brown Chair — brown leather | 24. Rio Cord Grey Chair — grey cord | 25. Sorrento Grey Chair — grey fabric
2+2 SET — £500 (ID 26) | 3+1 SET — £520 (ID 27) | 3+3 SET — £620 (ID 28)

━━━━━━━━━━━━━━━━━━━━━━━
SHOWING 3+3, 3+1, 2+2 SETS — VERY IMPORTANT:
When customer asks about 3+3, 3+1, or 2+2 sets, DO NOT say we have no photos.
Instead show them the matching individual pieces and explain:

For 3+3 (£620): Send [SHOW_ID:X] for the matching 3 seater and say "Here's what the 3 seater looks like — the 3+3 set would be two of these together 😊 Total £620 with free delivery."
For 3+1 (£520): Send [SHOW_ID:X] for matching 3 seater and say "Here's the 3 seater — the 3+1 set comes with this plus a matching single chair 😊 Total £520 with free delivery."
For 2+2 (£500): Send [SHOW_ID:X] for matching 2 seater and say "Here's the 2 seater — the 2+2 set would be two of these together 😊 Total £500 with free delivery."

If customer hasn't specified colour, ask "Which colour were you thinking? We have black, grey, or brown 😊" then show matching photo.

━━━━━━━━━━━━━━━━━━━━━━━
PRICING COMBINATIONS:
- Corner + Chair = £800 | Corner + 2 Seater = £880 | Corner + 3 Seater = £930
- 3+2 + extra 2 Seater = £850 | 3+2 + extra 3 Seater = £900 | 3+2 + Chair = £770
- Any other combo: add prices together.
Say: "That'll be £[total] in total with free delivery 😊 Shall I go ahead with the order?"

━━━━━━━━━━━━━━━━━━━━━━━
DELIVERY RULES — follow this EXACTLY:

When customer asks "how long is delivery" / "how long does it take" / "when will it arrive":
→ NEVER give a specific date straight away
→ Reply: "Normally we deliver in 1-3 days 😊 When are you looking for delivery — asap or do you have a specific date in mind?"

When customer says "asap" / "as soon as possible" / "quickly":
→ Calculate 2 days from today and suggest that date
→ Today is available in the system as TODAY date. Add 2 days to get the suggested date.
→ Reply: "Is [date 2 days from today] okay for delivery? 😊"
→ If customer says yes → "Perfect! We'll give you a ring the day before to confirm the exact time 😊"

When customer gives a specific date:
→ ALWAYS agree immediately
→ Reply: "Perfect, we'll get that booked in for [date]! We'll ring you the day before to confirm the exact time 😊"

NEVER say no to any delivery date. Customer is always right on delivery.
NEVER give a specific date unless customer asked for asap or gave their own date.

PAYMENT: Cash on delivery. Bank transfer also accepted.
WHATSAPP: ${WHATSAPP}

━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION FLOW:

STEP 1 — FIRST MESSAGE:
"can i make a purchase" / "interested" / ad → [SHOW_ALL] then "Are you looking for a 3+2 set, corner sofa, or individual pieces? 😊"

STEP 2 — TYPE SELECTION:
- "3+2" → [SHOW_3_2] then "Which one catches your eye? 😊"
- "corner" → [SHOW_CORNER] then "Which one catches your eye? 😊"
- "3 seater" / "individual" → [SHOW_3SEATERS] then "Which colour do you prefer? 😊"
- "2 seater" → [SHOW_2SEATERS] then "Which colour? 😊"
- "3+3" / "3+1" / "2+2" → ask colour if not given, then show matching piece photo with explanation above

COLOUR SPECIFIED WITHOUT TYPE — very important:
If customer mentions ONLY a colour (brown, black, grey) but has NOT said what type they want (3+2, corner, 3 seater etc):
→ NEVER send any photos yet
→ Ask: "Would you like that in a 3+2 set, corner sofa, or individual pieces? 😊"
→ Only send photos AFTER they confirm the type

COLOUR + TYPE SPECIFIED TOGETHER:
If customer says both colour AND type (e.g. "brown corner", "black 3+2", "grey 3 seater"):
→ Send ONLY [SHOW_ID:X] for that specific sofa. Never send group photos.

NEVER send [SHOW_ALL], [SHOW_3_2], [SHOW_CORNER] etc when a colour has already been specified.

STEP 3 — SPECIFIC SOFA SELECTED:
- IDs 1-20: ALWAYS [SHOW_ID:X] — ALL have photos. NEVER say photo unavailable.
- IDs 21-24: use matching piece photo as described above, never say no photos.
- Then: "[Compliment]! The [name] is £[price] with free delivery 😊 Shall I go ahead and place your order?"

STEP 3b — PHOTO REQUEST:
"photo" / "pic" / "show me" / "can I see" → [SHOW_ID:X] for last sofa discussed. Always.

STEP 3c — EXTRA PIECES:
Add prices → "That'll be £[total] in total 😊 Shall I go ahead?"

STEP 4 — ORDER COLLECTION:
→ EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"

STEP 5 — ORDER CONFIRMED:
→ EXACTLY: "Perfect! Your order is confirmed. We'll be in touch to arrange delivery. Thank you for choosing Nova Livings! 👍"

━━━━━━━━━━━━━━━━━━━━━━━
PHOTO TRIGGERS:
[SHOW_ALL]      = all 10 set/corner photos (IDs 1-10)
[SHOW_3_2]      = 5 three+two photos (IDs 1-5)
[SHOW_CORNER]   = 5 corner photos (IDs 6-10)
[SHOW_3SEATERS] = 5 individual 3 seater photos (IDs 11-15)
[SHOW_2SEATERS] = 5 individual 2 seater photos (IDs 16-20)
[SHOW_CHAIRS]   = 5 single chair photos (IDs 21-25)
[SHOW_ID:X]     = single photo for sofa X (1-25)

MATERIAL KNOWLEDGE — never get this wrong:
- Roma range = LEATHER (available in black, grey, brown)
- Sorrento range = FABRIC (available in grey)
- Rio Cord range = CORD FABRIC (available in grey)
- We DO stock brown leather — it is the Roma Brown range
- Never tell a customer we do not have a material if we do

CRITICAL:
- NEVER say "we don't have photos" for any product. Always show the closest matching photo.
- For 3+3/3+1/2+2: show the matching piece photo and explain what the set looks like.
- Always say YES to any delivery date.
- Never re-send group photos after specific sofa picked.
- Use customer name once known.`;
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
const pausedChats = new Set(); // customers where bot is paused

async function handleMessage(event) {
  const senderId = event.sender.id;
  const messageText = event.message?.text;
  if (!messageText) return;

  // ── Pause / Resume detection ─────────────────────────────────────────
  if (messageText.trim().toLowerCase() === 'dear') {
    pausedChats.add(senderId);
    console.log(`Bot paused for ${senderId}`);
    return;
  }
  if (messageText.trim().toLowerCase() === 'boss') {
    pausedChats.delete(senderId);
    console.log(`Bot resumed for ${senderId}`);
    return;
  }

  // If bot is paused for this customer, do nothing
  if (pausedChats.has(senderId)) {
    console.log(`Bot is paused for ${senderId} — skipping`);
    return;
  }

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
        await sleep(300);
      }
    }
    // ── [SHOW_3_2] ────────────────────────────────────────────────────────
    else if (reply.includes('[SHOW_3_2]')) {
      reply = reply.replace('[SHOW_3_2]', '').trim();
      for (const sofa of SOFAS_3_2) {
        await sendImage(senderId, sofa.image);
        await sleep(300);
      }
    }
    // ── [SHOW_CORNER] ─────────────────────────────────────────────────────
    else if (reply.includes('[SHOW_CORNER]')) {
      reply = reply.replace('[SHOW_CORNER]', '').trim();
      for (const sofa of SOFAS_CORNER) {
        await sendImage(senderId, sofa.image);
        await sleep(300);
      }
    }
    // ── [SHOW_3SEATERS] ───────────────────────────────────────────────────
    else if (reply.includes('[SHOW_3SEATERS]')) {
      reply = reply.replace('[SHOW_3SEATERS]', '').trim();
      const threeSeaters = SOFAS_INDIVIDUAL.filter(s => s.type === '3seater');
      for (const sofa of threeSeaters) {
        await sendImage(senderId, sofa.image);
        await sleep(300);
      }
    }
    // ── [SHOW_2SEATERS] ───────────────────────────────────────────────────
    else if (reply.includes('[SHOW_2SEATERS]')) {
      reply = reply.replace('[SHOW_2SEATERS]', '').trim();
      const twoSeaters = SOFAS_INDIVIDUAL.filter(s => s.type === '2seater');
      for (const sofa of twoSeaters) {
        await sendImage(senderId, sofa.image);
        await sleep(300);
      }
    }
    // ── [SHOW_CHAIRS] ─────────────────────────────────────────────────────
    else if (reply.includes('[SHOW_CHAIRS]')) {
      reply = reply.replace('[SHOW_CHAIRS]', '').trim();
      const chairs = SOFAS_INDIVIDUAL.filter(s => s.type === 'chair');
      for (const sofa of chairs) {
        await sendImage(senderId, sofa.image);
        await sleep(300);
      }
    }

    // ── [SHOW_ID:X] ───────────────────────────────────────────────────────
    // Handle multiple SHOW_ID triggers in one reply (e.g. for 3+3 showing two pieces)
    const showIdMatches = [...reply.matchAll(/\[SHOW_ID:(\d+)\]/g)];
    for (const match of showIdMatches) {
      const sofaId = parseInt(match[1]);
      const sofa = ALL_SOFAS.find(s => s.id === sofaId);
      if (sofa && sofa.image) {
        await sendImage(senderId, sofa.image);
        await sleep(300);
      }
    }
    reply = reply.replace(/\[SHOW_ID:\d+\]/g, '').trim();

    conversations[senderId].push({ role: 'assistant', content: reply });

    // Split reply into multiple messages if [SPLIT] tag present
    if (reply) {
      const parts = reply.split('[SPLIT]').map(p => p.trim()).filter(p => p.length > 0);
      for (let i = 0; i < parts.length; i++) {
        await sendMessage(senderId, parts[i]);
        if (i < parts.length - 1) await sleep(800);
      }
    }

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
