---
✅ Airtable Script: Fetch Webflow Item Data via API
---

# Airtable ⇄ Webflow Item Fetcher

A script to fetch specific field values from a Webflow CMS item into Airtable using Webflow API v2.

---

## ✅ Overview

This script allows you to fetch specific fields from a Webflow CMS item using the Webflow API directly inside an Airtable automation script.

### 🔧 Features

- Supports **Webflow v2 API**.
- Pulls specific fields based on their **slug names**.
- Returns the field values as output in Airtable automations.
- Minimal input required — ideal for Airtable + Webflow integrations.

---

### 📦 Required Inputs

| Key           | Description                                              |
|---------------|----------------------------------------------------------|
| `collection_id` | Your Webflow CMS Collection ID                          |
| `item_id`       | The ID of the CMS item you want to retrieve             |
| `api_key`       | Webflow **OAuth Bearer Token** or **Site API key**      |
| `field_slugs`   | Comma-separated list of field slugs (e.g., `slug,ranking`) |

---

### 🧠 Notes

- The script **returns only** the requested slugs.
- The values are extracted from `fieldData`, as per Webflow v2 structure.
- If a field does not exist, its value will be returned as `null`.

---

### 💻 Script Code

```javascript
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
    return data.fieldData;
}

// Run it
await fetchWebflowData();
```

---

### 🔄 Sample Output

For input:
```text
field_slugs: slug, ranking
```

The output will look like:

```json
{
  "slug": "tudor-black-bay-chrono-79360n-flamingo-pink-dial-chronograph-stainless-steel",
  "ranking": 177
}
```
