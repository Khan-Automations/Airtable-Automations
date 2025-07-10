---
title: "Airtable Duplicate Record Remover"
description: "Automatically remove duplicate records from an Airtable table based on specified field values, retaining either the first or last record based on creation or modification time."
tags: [airtable, automation, deduplication, script]
---

## Instructions

This script is designed for Airtable Automations and helps clean up duplicate records within the same table by matching values across specified fields.

### 🔁 Trigger Conditions
- Set up the automation to trigger manually, on record updates, or on a scheduled basis depending on your use case.

### 🧾 Input Configuration

In your Airtable Automation → "Run script" action, configure the following input variables:

| Name         | Type   | Description                                                                 |
|--------------|--------|-----------------------------------------------------------------------------|
| `fieldIds`   | String | Comma-separated list of field IDs used to identify duplicates (e.g., `fldA,fldB`) |
| `keep`       | String | Choose which record to retain in each duplicate group: `first` or `last`    |
| `sortFieldId`| String | Field ID used to determine which record is first or last (e.g., `fldCreated`) |

### ⚙️ How It Works

1. Loads all records in the current table.
2. Groups them by a composite key made from the values of the specified fields.
3. Sorts each group using the `sortFieldId`.
4. Keeps either the first or last record in each group (as specified by `keep`).
5. Deletes the remaining duplicates in batches of 50 (Airtable API limit).

## ✅ Script

```js
let { fieldIds, keep, sortFieldId } = input.config();

// Convert comma-separated fieldIds to array
let matchFields = fieldIds.split(',').map(f => f.trim());

// Load table and records
let table = base.getTable("Your Table Name or ID");
let query = await table.selectRecordsAsync();

// Grouping map
let grouped = {};

// Group records by the composite key of specified fields
for (let record of query.records) {
    let key = matchFields.map(fid => record.getCellValue(fid)).join('|');

    if (!grouped[key]) {
        grouped[key] = [];
    }

    grouped[key].push(record);
}

// For each duplicate group, sort and delete
for (let key in grouped) {
    let records = grouped[key];
    if (records.length <= 1) continue;

    // Sort based on the sortFieldId
    records.sort((a, b) => {
        let aVal = a.getCellValue(sortFieldId);
        let bVal = b.getCellValue(sortFieldId);
        return new Date(aVal) - new Date(bVal);
    });

    let toKeep = keep === 'first' ? records[0].id : records[records.length - 1].id;

    // Filter out the one to keep
    let toDelete = records.filter(r => r.id !== toKeep);

    // Delete in batches
    while (toDelete.length > 0) {
        await table.deleteRecordsAsync(toDelete.slice(0, 50));
        toDelete = toDelete.slice(50);
    }
}
```

## 💡 Tips / Requirements

- ⚠️ **This script deletes records**. Always test on a backup or view before enabling.
- `sortFieldId` must reference a valid date-type field (e.g., "Created time", "Last modified time").
- Field IDs (not field names) must be used in the input configuration.
- Works only within the current active table (where the script is executed).

