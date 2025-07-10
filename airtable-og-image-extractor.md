---
title: "Extract og:image URL from Web Page"
description: "This Airtable automation script fetches a given web page and extracts the value of its Open Graph image (og:image) meta tag for use in downstream steps."
tags: [airtable, automation, scraping, metadata, og-image]
---

## Instructions

### 📌 Trigger
Use this script as part of an Airtable Automation. The trigger can be any event (e.g., record created or updated) that includes a field containing the target web page URL.

### ⚙️ Input Configuration
Define an input variable named `url` in your Airtable automation, which holds the web page URL from which you want to extract the Open Graph image.

### 🌐 External Services
- No external APIs required.
- The script uses `fetch()` to retrieve the HTML content of the specified URL.

### 🧰 Preparation
- Ensure the input URL is valid and reachable.
- The web page must contain a properly formatted Open Graph meta tag in this format:

```html
<meta property="og:image" content="https://example.com/image.jpg" />
```

If this tag is missing or malformed, the output will return `'Not found'`.

---

## Code

```js
// Get the input URL from an automation variable
let inputConfig = input.config();
let url = inputConfig.url;

if (!url) {
  throw new Error('❌ No URL provided.');
}

try {
  let response = await fetch(url);
  let html = await response.text();

  // Use regex to extract the og:image meta tag
  let match = html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
  let imageUrl = match && match[1] ? match[1] : 'Not found';

  // Return the result to be used in later steps
  output.set('imageUrl', imageUrl);
} catch (error) {
  output.set('imageUrl', 'Error');
  console.error('Fetch failed:', error);
}
```

---

## ✅ Tips / Requirements

- This script is synchronous and must be run in an Airtable scripting automation step.
- If you're dealing with pages that redirect or load data via JavaScript (e.g., SPAs), this script may not capture the desired output due to limitations of `fetch()` in Airtable's runtime.
- You may optionally validate the extracted URL format using regex or additional logic if needed.
