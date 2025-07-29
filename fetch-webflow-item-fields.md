---
title: "Fetch Webflow Item Fields into Airtable"
description: "Retrieve specific field values from a Webflow CMS item using Webflow's v2 API and populate them into Airtable."
tags: [airtable, webflow, api, automation, integration]
---

### Instructions

This script is designed to be used inside an Airtable Automation to fetch selected field values from a Webflow CMS item and store them in Airtable. It utilizes Webflow's **v2 API**.

#### 🔁 Trigger
- **Trigger**: Can be triggered manually or based on record changes in Airtable.

#### ⚙️ Input Configuration (Airtable Automation variables)
You must define the following input variables in the Airtable script action step:

- `collection_id` — The ID of your Webflow CMS collection.
- `item_id` — The ID of the specific CMS item you want to retrieve.
- `api_key` — Your Webflow API Key (must have access to the site and collection).
- `field_slugs` — A comma-separated list of field slugs you want to retrieve from the Webflow item.

#### 🌐 External Services
- **Webflow CMS API v2**
  - Endpoint: `GET https://api.webflow.com/v2/collections/:collection_id/items/:item_id/live`
  - Authentication: Bearer token (`api_key`)

#### 🧩 Preparation
- Make sure the Webflow site has the CMS collection and item published.
- Get your **Collection ID** and **Item ID** from Webflow (via the CMS tab or API).
- The field slugs must match the keys used in the Webflow CMS item schema.
- Your **API Key** must be generated in Webflow and have the appropriate access level.

---

### Code

```js
// Input config from Airtable
let inputConfig = input.config();
let collectionId = inputConfig.collection_id;
let itemId = inputConfig.item_id;
let apiKey = inputConfig.api_key;
let fieldSlugs = inputConfig.field_slugs.split(',').map(slug => slug.trim());

// Validate input
if (!collectionId || !itemId || !apiKey || fieldSlugs.length === 0) {
    throw new Error("Missing required parameters: collection_id, item_id, api_key, or field_slugs.");
}

// Main function
async function fetchWebflowData() {
    try {
        const itemFields = await fetchWebflowItem(apiKey, collectionId, itemId);
        const result = {};

        for (const slug of fieldSlugs) {
            result[slug] = slug in itemFields ? itemFields[slug] : null;
        }

        output.set('webflowData', result);
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// Helper to fetch data from Webflow
async function fetchWebflowItem(apiKey, collectionId, itemId) {
    const url = `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}/live`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${apiKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`Webflow API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data.fieldData; // <-- This is the fix!
}

// Run it
await fetchWebflowData();
```

---

### ✅ Tips / Requirements

- Ensure all fields in `field_slugs` exist in the Webflow CMS schema.
- Only **live** (published) item values are retrieved.
- This script returns the result as an object via `output.set('webflowData', result)` to be used in subsequent automation steps.
- Avoid rate limits by spacing automation runs if you fetch large volumes.
