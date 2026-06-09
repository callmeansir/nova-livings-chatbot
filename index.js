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

// ── PRODUCT CATALOGUE WITH IMAGES ──
const PRODUCTS = {
  recliners: [
    { name: 'Nova Electric Recliner Leather Corner Sofa', price: '£749', colours: ['Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Nova_Leather_Corner_Sofa.webp?v=1772291792&width=1080' },
    { name: 'MNS Leather Corner Sofa (230x230cm)', price: '£579', colours: ['Grey', 'Black', 'Brown'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/MNS_Leather_Corner_sofa.webp?v=1773065268&width=1080' },
    { name: 'Sara Leather Electric Recliner Corner Sofa', price: '£749', colours: ['Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/sara.jpg?v=1771943786&width=1080' },
    { name: 'Orlando Electric Recliner 3+2 LED & Wireless Charger', price: '£899', colours: ['Black', 'Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/11.webp?v=1775221877&width=1080' },
    { name: 'Roma Fabric Recliner 3+2 with Cup Holders', price: '£699', colours: ['Grey', 'Black', 'Brown'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/19_de87cfc0-3c3d-459b-98a6-e6739ec17854.jpg?v=1771944881&width=1080' },
  ],
  corner: [
    { name: 'Corner Sofa Collection', price: 'From £399', colours: ['Grey', 'Black', 'Brown', 'Cream', 'Mink', 'Beige', 'Platinum Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Right.jpg?v=1732558652&width=1080' },
  ],
  chesterfield: [
    { name: 'Chesterfield Sofa Collection', price: 'From £499', colours: ['Grey', 'Black', 'Brown', 'Cream'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/2_ed3999c5-8567-4bda-9462-f064b490c1b0.jpg?v=1747492788&width=1080' },
  ],
  ushape: [
    { name: 'U-Shape Sofa Collection', price: 'From £799', colours: ['Grey', 'Black', 'Brown', 'Cream', 'Mink'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/2_ed3999c5-8567-4bda-9462-f064b490c1b0.jpg?v=1747492788&width=1080' },
  ]
};

// ── AD-SPECIFIC CONTEXTS ──
const AD_CONTEXTS = {
  'recliner': 'The customer clicked on a RECLINER SOFA ad. Focus on recliners. Lead with Orlando (£899, LED + wireless charger) and Roma (£699). Ask electric or manual, and colour.',
  'corner': 'The customer clicked on a CORNER SOFA ad. Focus on corner sofas from £399. Ask size and colour. We have 83 in stock.',
  'chesterfield': 'The customer clicked on a CHESTERFIELD ad. Focus on Chesterfields from £499. Ask colour and size.',
  'ushape': 'The customer clicked on a U-SHAPE ad. Focus on U-shapes from £799. Ask room size and colour.',
  'general': 'Customer messaged directly. Give warm welcome and ask what sofa they are looking for.'
};

function buildSystemPrompt(adContext) {
  const context = AD_CONTEXTS[adContext] || AD_CONTEXTS['general'];
  return `You are a friendly sales assistant for Comfy Sofa Ltd, UK furniture business.

AD CONTEXT: ${context}

PRODUCTS:
RECLINERS:
- Nova Electric Recliner Leather Corner: £749 | Grey
- MNS Leather Corner Sofa 230x230cm: £579 | Grey, Black, Brown
- Sara Leather Electric Recliner Corner: £749 | Grey
- Orlando Electric Recliner 3+2 LED+Wireless Charger: £899 | Black, Grey
- Roma Fabric Recliner 3+2 Cup Holders: £699 | Grey, Black, Brown

CORNER SOFAS: From £399 | 83 items | Grey, Black, Brown, Cream, Mink, Beige, Platinum Grey
CHESTERFIELDS: From £499 | 12 items | Grey, Black, Brown, Cream
U-SHAPE: From £799 | 7 items | Grey, Black, Brown, Cream, Mink
SOFA BEDS: From £499 | 7 items

DELIVERY: Free UK mainland, 3-7 working days, free assembly
PAYMENT: Full payment, Klarna BNPL, COD available, all major cards + PayPal + Apple Pay
WHATSAPP: ${WHATSAPP}
WEBSITE: https://mynewsofaltd.co.uk

PHOTO INSTRUCTIONS:
- When customer asks about a specific product OR asks to see a photo, include [SEND_IMAGE:TYPE] in your reply
- Use [SEND_IMAGE:orlando] for Orlando, [SEND_IMAGE:roma] for Roma, [SEND_IMAGE:nova] for Nova, [SEND_IMAGE:sara] for Sara, [SEND_IMAGE:mns] for MNS Leather Corner, [SEND_IMAGE:corner] for corner sofas, [SEND_IMAGE:chesterfield] for chesterfields, [SEND_IMAGE:ushape] for u-shape
- ALWAYS send an image when talking about a specific product for the first time

RULES:
- Be friendly and warm
- Keep replies under 120 words
- Always qualify customer (type, colour, size)
- For buying/complex queries give WhatsApp: ${WHATSAPP}
- Never invent prices
- Use UK English
- Always end with a question`;
}

// ── IMAGE MAP ──
const IMAGE_MAP = {
  'orlando': 'https://mynewsofaltd.co.uk/cdn/shop/files/11.webp?v=1775221877&width=1080',
  'roma': 'https://mynewsofaltd.co.uk/cdn/shop/files/19_de87cfc0-3c3d-459b-98a6-e6739ec17854.jpg?v=1771944881&width=1080',
  'nova': 'https://mynewsofaltd.co.uk/cdn/shop/files/Nova_Leather_Corner_Sofa.webp?v=1772291792&width=1080',
  'sara': 'https://mynewsofaltd.co.uk/cdn/shop/files/sara.jpg?v=1771943786&width=1080',
  'mns': 'https://mynewsofaltd.co.uk/cdn/shop/files/MNS_Leather_Corner_sofa.webp?v=1773065268&width=1080',
  'corner': 'https://mynewsofaltd.co.uk/cdn/shop/files/Right.jpg?v=1732558652&width=1080',
  'chesterfield': 'https://mynewsofaltd.co.uk/cdn/shop/files/2_ed3999c5-8567-4bda-9462-f064b490c1b0.jpg?v=1747492788&width=1080',
  'ushape': 'https://mynewsofaltd.co.uk/cdn/shop/files/2_ed3999c5-8567-4bda-9462-f064b490c1b0.jpg?v=1747492788&width=1080',
  'recliner': 'https://mynewsofaltd.co.uk/cdn/shop/files/11.webp?v=1775221877&width=1080',
};

// ── WEBHOOK VERIFICATION ──
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// ── RECEIVE MESSAGES ──
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

  const ref = event.message?.referral?.ref || conversations[senderId]?.adContext || 'general';
  const adContext = detectAdContext(ref, messageText);

  if (!conversations[senderId]) {
    conversations[senderId] = { history: [], adContext };
  }

  conversations[senderId].history.push({ role: 'user', content: messageText });
  if (conversations[senderId].history.length > 10) {
    conversations[senderId].history = conversations[senderId].history.slice(-10);
  }

  try {
    await sendTyping(senderId);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: buildSystemPrompt(adContext),
      messages: conversations[senderId].history
    });

    let reply = response.content[0].text;

    // Extract and send image if requested
    const imageMatch = reply.match(/\[SEND_IMAGE:(\w+)\]/gi);
    if (imageMatch) {
      for (const match of imageMatch) {
        const imageType = match.replace('[SEND_IMAGE:', '').replace(']', '').toLowerCase();
        const imageUrl = IMAGE_MAP[imageType];
        if (imageUrl) {
          await sendImage(senderId, imageUrl);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      reply = reply.replace(/\[SEND_IMAGE:\w+\]/gi, '').trim();
    }

    conversations[senderId].history.push({ role: 'assistant', content: reply });

    if (reply) await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error.message);
    await sendMessage(senderId, `Hi! Thanks for getting in touch 😊 For the fastest help, WhatsApp us directly on ${WHATSAPP} and our team will assist you right away!`);
  }
}

function detectAdContext(ref, message) {
  const text = (ref + ' ' + message).toLowerCase();
  if (text.includes('recliner')) return 'recliner';
  if (text.includes('corner')) return 'corner';
  if (text.includes('chesterfield')) return 'chesterfield';
  if (text.includes('ushape') || text.includes('u-shape') || text.includes('u shape')) return 'ushape';
  return 'general';
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
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: { url: imageUrl, is_reusable: true }
          }
        }
      },
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
