const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const conversations = {};

// ── PRODUCT CATALOGUE WITH IMAGES ──
const PRODUCTS = {
  recliners: [
    { name: 'Nova Electric Recliner Leather Corner Sofa', price: '£749', colours: ['Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Nova_Leather_Corner_Sofa.webp', url: 'https://mynewsofaltd.co.uk/products/nova-electric-recliner-real-leather-corner-sofa' },
    { name: 'MNS Leather Corner Sofa (230x230cm)', price: '£579', colours: ['Grey', 'Black', 'Brown'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/MNS_Leather_Corner_sofa.webp', url: 'https://mynewsofaltd.co.uk/products/roma-leather-recliner-corner-sofa' },
    { name: 'Sara Leather Electric Recliner Corner Sofa', price: '£749', colours: ['Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Gemini_Generated_Image_sawjb7sawjb7sawj.webp', url: 'https://mynewsofaltd.co.uk/products/sara-real-leather-electric-recliner-corner-sofa' },
    { name: 'Orlando Electric Recliner 3+2 Seater LED & Wireless Charger', price: '£899', colours: ['Black', 'Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/11.webp', url: 'https://mynewsofaltd.co.uk/products/orlando-electric-recliners' },
    { name: 'Roma Fabric Recliner 3+2 Seater with Cup Holders', price: '£699', colours: ['Grey', 'Black', 'Brown'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/19_de87cfc0-3c3d-459b-98a6-e6739ec17854.jpg', url: 'https://mynewsofaltd.co.uk/collections/fabric-reclines' },
  ],
  corner: [
    { name: 'Dino Large Corner Sofa Jumbo Cord', price: '£599', colours: ['Beige', 'Brown'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Right.jpg', url: 'https://mynewsofaltd.co.uk/collections/corner-sofa' },
    { name: 'MNS Corner Sofa Collection', price: 'From £399', colours: ['Grey', 'Black', 'Brown', 'Cream', 'Mink', 'Beige', 'Platinum Grey'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Web.webp', url: 'https://mynewsofaltd.co.uk/collections/corner-sofa' },
  ],
  chesterfield: [
    { name: 'Chesterfield Sofa Collection', price: 'From £499', colours: ['Grey', 'Black', 'Brown', 'Cream'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Web.webp', url: 'https://mynewsofaltd.co.uk/collections/chesterfield-sofas' },
  ],
  ushape: [
    { name: 'U-Shape Sofa Collection', price: 'From £799', colours: ['Grey', 'Black', 'Brown', 'Cream', 'Mink'], image: 'https://mynewsofaltd.co.uk/cdn/shop/files/Web.webp', url: 'https://mynewsofaltd.co.uk/collections/u-shape' },
  ]
};

// ── AD-SPECIFIC CONTEXTS ──
const AD_CONTEXTS = {
  'recliner': `The customer clicked on a RECLINER SOFA ad. Focus on our recliner range. Lead with the Orlando (£899, LED lights, wireless charger) and Roma Fabric Recliner (£699). Ask if they want electric or manual recliner, and what colour.`,
  'corner': `The customer clicked on a CORNER SOFA ad. Focus on our corner sofa range starting from £399. Ask what size they need and what colour. Mention we have 83 corner sofas in stock.`,
  'chesterfield': `The customer clicked on a CHESTERFIELD SOFA ad. Focus on our Chesterfield collection from £499. Ask about colour preference and size.`,
  'ushape': `The customer clicked on a U-SHAPE SOFA ad. Focus on our U-shape sofas from £799. Ask about their room size and colour preference.`,
  'general': `The customer messaged from a general ad or directly. Give them a warm welcome and ask what type of sofa they are looking for.`
};

// ── SYSTEM PROMPT ──
function buildSystemPrompt(adContext) {
  const context = AD_CONTEXTS[adContext] || AD_CONTEXTS['general'];
  return `You are a friendly and helpful sales assistant for Comfy Sofa Ltd, a UK furniture business. You sell sofas from the My New Sofa (MNS) range.

AD CONTEXT: ${context}

FULL PRODUCT RANGE:
RECLINER SOFAS:
- Nova Electric Recliner Leather Corner Sofa: £749 | Colours: Grey | Electric recliner
- MNS Leather Corner Sofa (230x230cm): £579 | Colours: Grey, Black, Brown | Manual recliner
- Sara Leather Electric Recliner Corner Sofa: £749 | Colours: Grey | Electric recliner
- Orlando Electric Recliner 3+2 Seater: £899 | Colours: Black, Grey | LED lights + wireless charger
- Roma Fabric Recliner 3+2 with Cup Holders: £699 | Colours: Grey, Black, Brown | Manual recliner

CORNER SOFAS:
- Large range from £399 | 83 items in stock
- Colours: Grey, Black, Brown, Cream, Mink, Beige, Platinum Grey

CHESTERFIELD SOFAS:
- From £499 | 12 items in stock
- Colours: Grey, Black, Brown, Cream

U-SHAPE SOFAS:
- From £799 | 7 items in stock
- Colours: Grey, Black, Brown, Cream, Mink

SOFA BEDS:
- From £499 | 7 items in stock

DELIVERY:
- Free delivery across all UK mainland
- 3-7 working days standard delivery
- Free assembly/setup included

PAYMENT OPTIONS:
- Pay in full — all major cards, PayPal, Apple Pay, Google Pay, Klarna
- Cash on Delivery (COD) available — text WhatsApp first
- Buy Now Pay Later with Klarna

COLOURS AVAILABLE:
Black, Grey, Brown, Cream, Beige, Mink, Platinum Grey

WEBSITE: https://mynewsofaltd.co.uk
WHATSAPP: 07700 000000 (replace with real number)

PHOTO FEATURE:
- If customer asks to see a sofa, or asks "can I see it?" — reply with: [SEND_IMAGE:recliner] or [SEND_IMAGE:corner] or [SEND_IMAGE:chesterfield]
- This will trigger an automatic photo to be sent

RULES:
- Be friendly, warm, and helpful — like a real sales person
- Keep replies concise — under 150 words
- Always try to qualify the customer (what type, what colour, what size)
- If they want to buy or need more help, give them the WhatsApp number
- Never make up prices not listed above
- Always end with a question or next step
- Use UK English`;
}

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

  // Detect ad context from ref parameter
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
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: buildSystemPrompt(adContext),
      messages: conversations[senderId].history
    });

    let reply = response.content[0].text;

    // Check if AI wants to send an image
    const imageMatch = reply.match(/\[SEND_IMAGE:(\w+)\]/);
    if (imageMatch) {
      const imageType = imageMatch[1];
      reply = reply.replace(/\[SEND_IMAGE:\w+\]/, '').trim();
      
      // Send image first
      const product = PRODUCTS[imageType]?.[0];
      if (product) {
        await sendImage(senderId, product.image, product.name);
      }
    }

    conversations[senderId].history.push({ role: 'assistant', content: reply });
    await sendMessage(senderId, reply);

  } catch (error) {
    console.error('Error:', error);
    await sendMessage(senderId, 'Hi! Thanks for your message 😊 For the fastest response, please WhatsApp us directly and our team will help you right away!');
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
  await axios.post(`https://graph.facebook.com/v18.0/me/messages`,
    { recipient: { id: recipientId }, message: { text } },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  );
}

async function sendImage(recipientId, imageUrl, caption) {
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
}

async function sendTyping(recipientId) {
  await axios.post(`https://graph.facebook.com/v18.0/me/messages`,
    { recipient: { id: recipientId }, sender_action: 'typing_on' },
    { params: { access_token: PAGE_ACCESS_TOKEN } }
  ).catch(() => {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nova Livings chatbot running on port ${PORT}`));
