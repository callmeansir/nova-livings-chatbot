const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP = '+447888368461';

// GitHub raw image URLs — spaces encoded as %20
const G = 'https://raw.githubusercontent.com/callmeansir/nova-livings-chatbot/main/images';

const SOFAS_3_2 = [
  { id: 1, name: 'Roma Black 3+2 Recliner',    price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31.jpeg` },
  { id: 2, name: 'Rio Cord Grey 3+2 Recliner', price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(1).jpeg` },
  { id: 3, name: 'Sorrento Grey 3+2 Recliner', price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(2).jpeg` },
  { id: 4, name: 'Roma Brown 3+2 Recliner',    price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.31%20(3).jpeg` },
  { id: 5, name: 'Roma Grey 3+2 Recliner',     price: '£550', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32.jpeg` },
];

const SOFAS_CORNER = [
  { id: 6,  name: 'Rio Cord Corner Recliner',      price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(1).jpeg` },
  { id: 7,  name: 'Roma Brown Corner Recliner',    price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(2).jpeg` },
  { id: 8,  name: 'Roma Black Corner Recliner',    price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.32%20(3).jpeg` },
  { id: 9,  name: 'Roma Grey Corner Recliner',     price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.33.jpeg` },
  { id: 10, name: 'Sorrento Grey Corner Recliner', price: '£580', image: `${G}/WhatsApp%20Image%202026-06-09%20at%2020.55.33%20(1).jpeg` },
];

const ALL_SOFAS = [...SOFAS_3_2, ...SOFAS_CORNER];

function buildSystemPrompt(source) {
  let adContext = source === 'ad'
    ? `Customer came from your Facebook ad or said 'Can I make a purchase?'. Use [SHOW_ALL] immediately — no questions first. After photos say "Which one catches your eye? 😊"`
    : `Customer sent a direct message. Welcome them warmly and ask what type of sofa they are looking for.`;

  return `You are a sales assistant for Comfy Sofa Ltd, UK sofa business. Reply like a real human — warm, short, natural. No bullet points, no bold text, max 2-3 sentences.

SOURCE: ${adContext}

PRODUCTS:
3+2 RECLINER SETS — £550 (manual recliners):
1. Roma Black 3+2 — black leather
2. Rio Cord Grey 3+2 — grey cord fabric
3. Sorrento Grey 3+2 — grey fabric, cup holders
4. Roma Brown 3+2 — brown leather, cup holders
5. Roma Grey 3+2 — grey leather, cup holders

CORNER RECLINERS — £580 (manual recliners):
6. Rio Cord Corner — grey cord fabric
7. Roma Brown Corner — brown leather, cup holders
8. Roma Black Corner — black leather, cup holders
9. Roma Grey Corner — grey leather, cup holders
10. Sorrento Grey Corner — grey fabric, cup holders

DELIVERY: Free UK, 2-4 working days, free assembly, ring day before for exact time. Specific day/date — yes that's fine.
PAYMENT: Cash on delivery. Bank transfer if asked.
WHATSAPP: ${WHATSAPP}

PHOTO TRIGGERS (use in reply):
[SHOW_ALL] = sends all 10 photos
[SHOW_3_2] = sends 5 three+two photos
[SHOW_CORNER] = sends 5 corner photos

CUSTOMER REQUESTS:
- "Roma" → ask colour (Black/Grey/Brown)
- "Sorrento" → ask 3+2 or corner
- "Rio" → ask 3+2 or corner  
- number e.g. "number 3" → Sorrento Grey 3+2
- "corner" → [SHOW_CORNER]
- "3+2" → [SHOW_3_2]

ORDER FLOW:
- Ready to buy → ask "Would you like to place your order? 😊"
- Yes → EXACTLY: "To place your order, please provide the following:\n\nFull Name\nFull Delivery Address\nPostcode\nContact Number\n\nThank you 😊"
- Details received → "Perfect! Your order is confirmed. We'll be in touch to arrange delivery 👍"`;
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

  // Detect source on first message
  if (!customerContext[senderId]) {
    const referral = event.referral || event.message?.referral;
    const fromAd = (referral && (referral.ref || referral.source === 'ADS'))
      || messageText.toLowerCase().includes('can i make a purchase')
      || messageText.toLowerCase().includes('make a purchase');
    customerContext[senderId] = fromAd ? 'ad' : 'direct';
    console.log(`New customer ${senderId} — source: ${customerContext[senderId]}`);
  }

  if (!conversations[senderId]) conversations[senderId] = [];
  conversations[senderId].push({ role: 'user', content: messageText });
  if (conversations[senderId].length > 20) conversations[senderId] = conversations[senderId].slice(-20);

  try {
    await sendTyping(senderId);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: buildSystemPrompt(customerContext[senderId]),
      messages: conversations[senderId]
    });

    let reply = response.content[0].text;

    // Handle photo triggers
    if (reply.includes('[SHOW_ALL]')) {
      reply = reply.replace('[SHOW_ALL]', '').trim();
      for (const sofa of ALL_SOFAS) {
        await sendImage(senderId, sofa.image);
        await sleep(800);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    } else if (reply.includes('[SHOW_3_2]')) {
      reply = reply.replace('[SHOW_3_2]', '').trim();
      for (const sofa of SOFAS_3_2) {
        await sendImage(senderId, sofa.image);
        await sleep(800);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    } else if (reply.includes('[SHOW_CORNER]')) {
      reply = reply.replace('[SHOW_CORNER]', '').trim();
      for (const sofa of SOFAS_CORNER) {
        await sendImage(senderId, sofa.image);
        await sleep(800);
        await sendMessage(senderId, `${sofa.id}. ${sofa.name} — ${sofa.price}`);
        await sleep(400);
      }
    }

    conversations[senderId].push({ role: 'assistant', content: reply });
    if (reply) await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Hey sorry! Message us on WhatsApp and we'll help straight away — ${WHATSAPP} 👍`);
  }
}

const customerContext = {};
const conversations = {};

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
