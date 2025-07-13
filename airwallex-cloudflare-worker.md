---
title: "Airwallex Webhook Signature Verification via Cloudflare Worker"
description: "Verify Airwallex webhook signatures using HMAC SHA-256 in a Cloudflare Worker, then forward verified payloads to Make.com."
tags: [airwallex, webhook, cloudflare, make, automation]
---

## 🧩 Overview
This guide walks you through setting up a **Cloudflare Worker** to:

1. **Receive webhook events** from Airwallex
2. **Verify webhook signature** using HMAC SHA-256
3. **Forward the raw payload** to Make.com (formerly Integromat) only after successful verification

---

## ✅ Prerequisites
- A Cloudflare account
- Access to Cloudflare Workers
- Airwallex Webhook Secret
- Make.com scenario with a custom webhook URL

---

## 🛠️ Step-by-Step Setup

### 1. **Create the Worker**
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to `Workers & Pages`
3. Click `Create Application`
4. Choose **HTTP Handler** template
5. Name it `airwallex-webhook`

---

### 2. **Set Environment Variable**
1. Click the `Settings` tab of your Worker
2. Under **Environment Variables**, add:

   | Key               | Value                      |
   |------------------|----------------------------|
   | `AIRWALLEX_SECRET` | Your Airwallex webhook secret |

---

### 3. **Paste the Worker Script**
Replace the default script with the following:

```js
export default {
  async fetch(request, env, ctx) {
    const secret = env.AIRWALLEX_SECRET;
    const makeWebhookUrl = "https://hook.make.com/your-webhook-id"; // Replace with actual URL

    const timestamp = request.headers.get('x-timestamp');
    const receivedSignature = request.headers.get('x-signature');
    if (!timestamp || !receivedSignature) {
      return new Response("Missing signature headers", { status: 400 });
    }

    const rawBody = await request.text();
    const valueToDigest = `${timestamp}${rawBody}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(valueToDigest);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const signatureHex = [...new Uint8Array(signatureBuffer)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (signatureHex !== receivedSignature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const forwardResponse = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: rawBody
    });

    if (!forwardResponse.ok) {
      return new Response(`Forward failed: ${forwardResponse.statusText}`, { status: 500 });
    }

    return new Response("✅ Webhook received and forwarded", { status: 200 });
  }
};
```

---

### 4. **Deploy Your Worker**
- Click `Save & Deploy`
- Copy the public URL for the Worker

---

### 5. **Register the Webhook in Airwallex**
1. Go to `Developer > Webhooks > Summary`
2. Click `Add Webhook`
3. Paste your Cloudflare Worker URL as the **notification URL**
4. Select desired events (e.g., `payment_intent.succeeded`)
5. Set the **Webhook Secret** (must match `AIRWALLEX_SECRET` in Cloudflare)

---

## 🧪 Test the Webhook
- Use the **Test Event** button in Airwallex to trigger a sample payload
- Check your Make scenario to confirm payload receipt

---

## ✅ Notes
- The signature must be verified before parsing the payload.
- Ensure the Make webhook is active and receiving JSON.
- Handle potential retries and deduplication in Make.

---

## 📦 Result
You now have a secure and scalable setup where:
- Only **authentic** Airwallex events are accepted
- Events are **securely forwarded** to Make.com for automation
