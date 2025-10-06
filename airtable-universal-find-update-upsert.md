---
title: "Universal Find, Update, and Upsert Script for Airtable"
description: "A universal Airtable script that finds records based on field IDs and values, supports upsert behavior, and handles most field types — ideal for non-technical users using plain text inputs."
tags: [airtable, automation, upsert, find, update, script]
---

## Instructions

### Trigger
Use this script inside **Airtable Automations** under **Run a Script**.  
It can also be executed manually in the **Scripting App**.

### Input Configuration (`input.config()`)

Provide the following input variables in the automation setup:

| Field | Type | Description |
|-------|------|--------------|
| `tableId` | string | The **Table ID** where the operation will run. |
| `searchFieldIds` | string (comma-separated) | Field IDs to search on, separated by commas. Example: `fld123,fld456` |
| `searchFieldValues` | string (comma-separated) | Values corresponding to each search field. Must match order and count. |
| `updateFieldIds` | string (comma-separated) | Field IDs to update or insert values into. |
| `updateFieldValues` | string (comma-separated) | Values to update, matching `updateFieldIds` in order. |
| `matchType` | string | `"Exact"` or `"Partial"` (default `"Exact"`). |
| `matchLogic` | string | `"ALL"` or `"ANY"` (default `"ALL"`). |
| `upsertMode` | string | `"updateOnly"`, `"insertIfNone"`, or `"alwaysInsert"` (default `"updateOnly"`). |

### What It Does

1. **Parses input strings** (comma-separated values) for easy setup — no JSON needed.  
2. **Finds records** based on provided search field IDs and values:
   - `matchType` defines **Exact** or **Partial** (case-insensitive substring) matches.
   - `matchLogic` defines whether **ALL** or **ANY** search criteria must match.
3. **Updates** all matching records using the given field IDs and values.
4. **Inserts new records** based on `upsertMode`:
   - `updateOnly`: Only update existing records.
   - `insertIfNone`: Insert new record if no match found.
   - `alwaysInsert`: Always insert a new record, regardless of matches.
5. **Auto-converts values** according to Airtable field types.

### Supported Field Types

✅ **Text fields**
- `singleLineText`, `multilineText`, `richText`, `email`, `url`, `phoneNumber`

✅ **Numeric fields**
- `number`, `currency`, `percent`, `duration`, `rating`

✅ **Boolean fields**
- `checkbox` (accepts `true`, `yes`, `1`, `on`)

✅ **Date fields**
- `date`, `dateTime` (converted to ISO format)

✅ **Select fields**
- `singleSelect`, `multipleSelects`

✅ **Collaborator fields**
- `singleCollaborator`, `multipleCollaborators` (use email addresses)

✅ **Attachment fields**
- `multipleAttachments` (URLs, comma-separated)

✅ **Linked record fields**
- `multipleRecordLinks` (record IDs, comma-separated)

✅ **Other**
- `barcode` (text)

---

## Code

```js
/*
  Airtable Universal Find + Update (with Upsert)
  - Input fields are plain text (comma-separated IDs and values)
  - Supports most Airtable field types
  - Easier for non-technical users (no JSON needed)
*/

const cfg = input.config();

// Helper: split comma-separated lists into arrays, trim spaces
function parseList(val) {
  if (!val) return [];
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
}

// Inputs
const tableId = cfg.tableId;
const searchFieldIds = parseList(cfg.searchFieldIds);
const searchFieldValues = parseList(cfg.searchFieldValues);
const updateFieldIds = parseList(cfg.updateFieldIds);
const updateFieldValues = parseList(cfg.updateFieldValues);

const matchType = String(cfg.matchType || 'Exact'); // Exact | Partial
const matchLogic = String(cfg.matchLogic || 'ALL'); // ALL | ANY
const upsertMode = String(cfg.upsertMode || 'updateOnly'); // updateOnly | insertIfNone | alwaysInsert

if (searchFieldIds.length !== searchFieldValues.length)
  throw new Error('searchFieldIds and searchFieldValues length mismatch');
if (updateFieldIds.length !== updateFieldValues.length)
  throw new Error('updateFieldIds and updateFieldValues length mismatch');

// Table + field info
const table = base.getTable(tableId);
function getFieldInfo(fid) {
  const f = table.getField(fid);
  return { id: f.id, name: f.name, type: f.type, options: f.options, isComputed: f.isComputed };
}

// Conversion function: turns plain string → correct Airtable field value
async function convertForField(value, fieldInfo) {
  const type = fieldInfo.type;
  const S = (v) => String(v ?? '').trim();

  if (value == null || S(value) === '') return null;

  switch (type) {
    case 'singleLineText':
    case 'multilineText':
    case 'richText':
    case 'email':
    case 'url':
    case 'phoneNumber':
      return S(value);

    case 'number':
    case 'currency':
    case 'percent':
    case 'duration':
      return Number(S(value)) || null;

    case 'checkbox':
      return ['true','1','yes','y','on'].includes(S(value).toLowerCase());

    case 'date':
    case 'dateTime': {
      const d = new Date(S(value));
      return isNaN(d.getTime()) ? null : d.toISOString();
    }

    case 'rating': {
      const n = Number(S(value));
      return isNaN(n) ? null : Math.max(0, Math.min(fieldInfo.options?.max || 5, n));
    }

    case 'singleSelect':
      return { name: S(value) };

    case 'multipleSelects':
      return parseList(value).map(v => ({ name: S(v) }));

    case 'singleCollaborator':
      return S(value).includes('@') ? { email: S(value) } : null;

    case 'multipleCollaborators':
      return parseList(value).map(v => v.includes('@') ? { email: v } : null).filter(Boolean);

    case 'multipleAttachments':
      return parseList(value).map(u => ({ url: S(u) }));

    case 'barcode':
      return { text: S(value) };

    // Links to other records → expect record IDs separated by commas
    case 'multipleRecordLinks':
      return parseList(value).map(id => ({ id }));

    default:
      return S(value);
  }
}

// Matching function
function cmpStr(a, b) {
  return matchType === 'Exact'
    ? a === b
    : a.toLowerCase().includes(b.toLowerCase());
}

function matches(fieldInfo, rec, searchVal) {
  const v = rec.getCellValue(fieldInfo.name);
  if (v == null) return false;

  switch (fieldInfo.type) {
    case 'singleSelect': return cmpStr(v.name ?? '', searchVal);
    case 'multipleSelects': return v.some(opt => cmpStr(opt.name ?? '', searchVal));
    case 'singleCollaborator': return cmpStr(v.email ?? v.name ?? '', searchVal);
    case 'multipleCollaborators': return v.some(u => cmpStr(u.email ?? u.name ?? '', searchVal));
    case 'multipleRecordLinks': return rec.getCellValueAsString(fieldInfo.name).split(',').some(s => cmpStr(s.trim(), searchVal));
    default: return cmpStr(String(v), String(searchVal));
  }
}

// Main
async function main() {
  const searchFields = searchFieldIds.map(getFieldInfo);
  const updateFields = updateFieldIds.map(getFieldInfo);

  const q = await table.selectRecordsAsync();
  const records = q.records;

  const matched = records.filter(rec => {
    if (matchLogic === 'ALL') return searchFields.every((f, i) => matches(f, rec, searchFieldValues[i]));
    return searchFields.some((f, i) => matches(f, rec, searchFieldValues[i]));
  });

  console.log(`Found ${matched.length} matching record(s)`);

  // --- Update ---
  if (matched.length > 0 && upsertMode !== 'alwaysInsert') {
    for (const rec of matched) {
      const updates = {};
      for (let i = 0; i < updateFields.length; i++) {
        updates[updateFields[i].id] = await convertForField(updateFieldValues[i], updateFields[i]);
      }
      await table.updateRecordAsync(rec.id, updates);
      console.log(`Updated ${rec.id}`);
    }
  }

  // --- Insert ---
  else if ((matched.length === 0 && upsertMode === 'insertIfNone') || upsertMode === 'alwaysInsert') {
    const newRec = {};
    for (let i = 0; i < updateFields.length; i++) {
      newRec[updateFields[i].id] = await convertForField(updateFieldValues[i], updateFields[i]);
    }
    const newId = await table.createRecordAsync(newRec);
    console.log(`Inserted new record ${newId}`);
  } else {
    console.log('No action taken.');
  }
}

await main();
```

---

## Tips / Requirements

- **Input simplicity:** Comma-separated IDs and values make this script accessible for non-developers.
- **Type conversion:** Automatically converts text to correct Airtable field types.
- **Upsert behavior:** Configure flexible record handling (`updateOnly`, `insertIfNone`, `alwaysInsert`).
- **Supported fields:** Works across text, numeric, date, select, collaborator, attachment, barcode, and linked record fields.
- **Safe defaults:** Skips computed fields automatically.
- **Matching control:** Case-insensitive matching supported with `"Partial"` mode.
- **Error handling:** Validates array lengths and required inputs before execution.

---

**Suggested filename:** `airtable-universal-find-update-upsert.md`
