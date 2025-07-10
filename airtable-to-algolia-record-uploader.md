---
title: "Airtable ⇄ Algolia Record Uploader"
description: "Update or upload records from Airtable to Algolia using the Algolia REST API within Airtable Automations."
tags: [airtable, algolia, api, automation]
---

## Overview

This script allows you to upload or update a record in an Algolia index directly from Airtable using Airtable Scripting. It uses the Algolia REST API to update an existing object based on the provided `objectID`.

## How It Works

When triggered via Airtable Automation, the script reads values like `name`, `tag`, `slug`, `image`, and `ranking` from the record fields configured in the automation input. It sends this data as a `PUT` request to Algolia’s indexing endpoint for the specified object.

## Instructions

1. **Set Up Required Fields in Airtable:**
   Ensure your Airtable base has fields named (or mapped as input variables in the automation) for:
   - `name`
   - `tag`
   - `slug`
   - `image`
   - `ranking`
   - `objectID` (must already exist in the Algolia index to update the item)

2. **Configure Airtable Automation:**
   - Trigger: Choose a trigger like “When record is updated” or “When record enters a view”.
   - Action: “Run a script”.
   - In the script action, add the following input variables:
     - `name`, `tag`, `slug`, `image`, `ranking`, `objectID`
     - `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_INDEX_NAME`

3. **Set Up the Script:**
   Paste the following script in the “Run a script” action:

   ```javascript
   // Load input variables from Airtable automation
   let {
     name,
     tag,
     slug,
     image,
     ranking,
     objectID,
     ALGOLIA_APP_ID,
     ALGOLIA_API_KEY,
     ALGOLIA_INDEX_NAME
   } = input.config();

   // Prepare the object to upload
   let recordObject = {
     Name: name,
     Tag: tag,
     Slug: slug,
     Image: image,
     Ranking: ranking,
     objectID: objectID  // Required for update
   };

   // Send to Algolia
   let url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/${encodeURIComponent(objectID)}`;
   let headers = {
     "X-Algolia-API-Key": ALGOLIA_API_KEY,
     "X-Algolia-Application-Id": ALGOLIA_APP_ID,
     "Content-Type": "application/json"
   };

   let response = await fetch(url, {
     method: "PUT",
     headers: headers,
     body: JSON.stringify(recordObject)
   });

   if (!response.ok) {
     let error = await response.text();
     throw new Error(`❌ Failed to update Algolia record: ${error}`);
   }

   console.log(`✅ Successfully uploaded/updated objectID: ${objectID}`);
   ```

## Tips

- 🔐 **Do not hardcode API keys**—use Airtable input variables to inject them securely.
- ⚠️ Ensure the `objectID` already exists in Algolia. This script performs an update (`PUT`), not a create (`POST`) operation.
- 🧪 Test the script with sample data before using it in production automation.

---
