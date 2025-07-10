---
title: "Airtable → Webhook Payload Sender"
description: "Send selected Airtable record field values as a POST request to a webhook URL for integration with external services."
tags: [airtable, webhook, api, automation]
---

# 📤 Send Airtable Record as Webhook Payload

## Description
This Airtable Automation script sends a POST request to a specified webhook URL with selected record field values as a JSON payload. It's ideal for integrating Airtable with services like Make.com, Zapier, n8n, or custom APIs.

## Instructions

1. **Create an Airtable Automation**  
   - Trigger: Choose a trigger (e.g., "When record is created" or "When record is updated").
   - Action: Add a "Run a script" step.

2. **Configure Input Variables**  
   In the "Run a script" action, add input variables:
   - `webhookUrl`: The target endpoint where the payload will be sent.
   - Any other variables you want to include in the payload (e.g., `name`, `email`, `recordId`, etc.).

3. **Paste the Script Below**  
   Use the following script in the script editor:

   ```javascript
   const config = input.config();
   const { webhookUrl, ...payload } = config;  // Exclude webhookUrl

   if (!webhookUrl) {
       console.log("❌ Error: webhookUrl is required");
   } else {
       try {
           const response = await fetch(webhookUrl, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(payload)  // All other fields sent here
           });
           console.log(`✅ Success: ${response.status} ${response.statusText}`);
       } catch (error) {
           console.log(`❌ Failed: ${error.message}`);
       }
   }
   ```

4. **Test the Automation**  
   Make sure to run a test with a valid webhook URL to confirm that data is being delivered correctly.

## ✅ Tips & Requirements
- The `webhookUrl` field is required and must be a valid POST endpoint.
- All other input variables will be included in the POST body as a JSON object.
- The receiving service must be ready to accept and parse a `Content-Type: application/json` payload.
- Great for use with Make.com custom webhooks, serverless functions, or internal APIs.
