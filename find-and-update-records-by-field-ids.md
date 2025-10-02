---
title: "Find & Update Records by Field IDs with Match Logic"
description: "Search Airtable records by one or more field IDs using Exact or Partial matching and update specified fields in all matching records. Configure inputs via Airtable Automations."
tags: [airtable, automation, records, updates, search, scripting]
---

## Instructions

### Trigger
- Use within **Airtable Automations** → **Run a script**.
- Trigger can be manual, on schedule, or “when record matches conditions,” depending on your use case.

### Input Configuration (via `input.config()`)
Provide these inputs in the **Automation → Run a script → Input variables**:

- `searchFieldIds` (string or array): Field **IDs** to search on.  
  - Accepts either an array (e.g., `["fldA","fldB"]`) or a comma-separated string (`"fldA,fldB"`).
- `searchFieldValues` (string or array): Values to match against `searchFieldIds` in the same order.  
  - Accepts array or comma-separated string; **must be the same length** as `searchFieldIds`.
- `updateFieldIds` (string or array): Field **IDs** to update for each matching record.
  - Accepts array or comma-separated string.
- `updateFieldValues` (string or array): Values to write into `updateFieldIds` in the same order.  
  - Accepts array or comma-separated string; **must be the same length** as `updateFieldIds`.
- `tableId` (string, optional): Airtable **Table ID**. Defaults to `"tblXXXXXXXXXXXXXX"` if not provided.
- `matchType` (string, optional): `"Exact"` or `"Partial"`. Default: `"Exact"`.  
  - **Exact**: strict string equality  
  - **Partial**: case-insensitive substring match
- `matchLogic` (string, optional): `"ALL"` or `"ANY"`. Default: `"ALL"`.  
  - **ALL**: every search field/value pair must match  
  - **ANY**: at least one search field/value pair must match

### What the Script Does
1. Parses inputs (supports arrays or comma-separated strings).
2. Validates lengths of search/update arrays and allowed values for `matchType` and `matchLogic`.
3. Loads the table by `tableId` and resolves field **names and types** from field **IDs**.
4. Fetches all records with `selectRecordsAsync()`.
5. Filters records based on the configured matching:
   - **Exact** or **Partial** (substring, case-insensitive)
   - **ALL** or **ANY** logic across field/value pairs
6. Converts each update value according to the target field’s type before writing:
   - `number`, `currency` → numeric when possible
   - `checkbox` → boolean from common truthy/falsey strings (`true/false`, `1/0`, `yes/no`)
   - `date` → parsed date returned as `YYYY-MM-DD` when valid
   - default → string
7. Updates each matching record via `updateRecordAsync()` and logs results.

### Preparation
- Collect **Field IDs** (not names) for all search and update fields.
- Ensure the automation has permission to read and update the target table.

---

## Code

```js
const inputConfig = input.config();

// Parse inputs - handle different data types
const parseInputArray = (inputValue) => {
    if (Array.isArray(inputValue)) {
        return inputValue.map(item => String(item).trim());
    }
    return String(inputValue).split(',').map(item => item.trim());
};

const searchFieldIds = parseInputArray(inputConfig.searchFieldIds);
const searchFieldValues = parseInputArray(inputConfig.searchFieldValues);
const updateFieldIds = parseInputArray(inputConfig.updateFieldIds);
const updateFieldValues = parseInputArray(inputConfig.updateFieldValues);
const tableId = inputConfig.tableId || "tblXXXXXXXXXXXXXX";

// Matching configuration
const matchType = String(inputConfig.matchType || "Exact"); // "Exact" or "Partial"
const matchLogic = String(inputConfig.matchLogic || "ALL"); // "ALL" or "ANY"

// Validate inputs
if (searchFieldIds.length !== searchFieldValues.length) {
    throw new Error("searchFieldIds and searchFieldValues must have the same number of items");
}

if (updateFieldIds.length !== updateFieldValues.length) {
    throw new Error("updateFieldIds and updateFieldValues must have the same number of items");
}

if (!["Exact", "Partial"].includes(matchType)) {
    throw new Error("matchType must be 'Exact' or 'Partial'");
}

if (!["ALL", "ANY"].includes(matchLogic)) {
    throw new Error("matchLogic must be 'ALL' or 'ANY'");
}

async function findAndUpdateRecords() {
    const table = base.getTable(tableId);
    
    // Get field names from IDs and their types
    const searchFields = searchFieldIds.map(fieldId => {
        try {
            const field = table.getField(fieldId);
            return {
                id: fieldId,
                name: field.name,
                type: field.type
            };
        } catch (error) {
            throw new Error(`Field ID ${fieldId} not found in table`);
        }
    });
    
    const updateFields = updateFieldIds.map(fieldId => {
        try {
            const field = table.getField(fieldId);
            return {
                id: fieldId,
                name: field.name,
                type: field.type
            };
        } catch (error) {
            throw new Error(`Field ID ${fieldId} not found in table`);
        }
    });
    
    // Query all records
    const queryResult = await table.selectRecordsAsync();
    const records = queryResult.records;
    
    // Define matching function based on matchType
    const matchesValue = (fieldValue, searchValue, fieldType) => {
        if (fieldValue === null) return false;
        
        const fieldValueStr = String(fieldValue);
        const searchValueStr = String(searchValue);
        
        if (matchType === "Exact") {
            // For exact matching, compare as strings
            return fieldValueStr === searchValueStr;
        } else { // Partial
            // For partial matching, use case-insensitive contains
            return fieldValueStr.toLowerCase().includes(searchValueStr.toLowerCase());
        }
    };
    
    // Convert update values to appropriate types based on field type
    const convertValueForField = (value, fieldType) => {
        const valueStr = String(value).trim();
        
        // Handle empty values
        if (valueStr === '') return null;
        
        switch (fieldType) {
            case 'number':
            case 'currency':
                // Convert to number if it's a valid number
                const num = Number(valueStr);
                return isNaN(num) ? valueStr : num;
                
            case 'checkbox':
                // Convert to boolean for checkbox fields
                if (valueStr.toLowerCase() === 'true' || valueStr === '1' || valueStr.toLowerCase() === 'yes') return true;
                if (valueStr.toLowerCase() === 'false' || valueStr === '0' || valueStr.toLowerCase() === 'no') return false;
                return Boolean(valueStr);
                
            case 'date':
                // Try to parse as date
                try {
                    const date = new Date(valueStr);
                    return isNaN(date.getTime()) ? valueStr : date.toISOString().split('T')[0];
                } catch {
                    return valueStr;
                }
                
            default:
                // For text, singleSelect, multipleSelects, etc., return as string
                return valueStr;
        }
    };
    
    // Find records based on matchLogic
    const matchingRecords = records.filter(record => {
        if (matchLogic === "ALL") {
            // ALL fields must match
            return searchFields.every((field, index) => {
                const fieldValue = record.getCellValue(field.name);
                const searchValue = searchFieldValues[index];
                return matchesValue(fieldValue, searchValue, field.type);
            });
        } else { // ANY
            // ANY field can match
            return searchFields.some((field, index) => {
                const fieldValue = record.getCellValue(field.name);
                const searchValue = searchFieldValues[index];
                return matchesValue(fieldValue, searchValue, field.type);
            });
        }
    });
    
    if (matchingRecords.length === 0) {
        console.log(`No records found matching criteria:`);
        console.log(`Match Type: ${matchType}`);
        console.log(`Match Logic: ${matchLogic}`);
        searchFields.forEach((field, index) => {
            console.log(`  ${field.name} (${field.type}): ${searchFieldValues[index]}`);
        });
        return;
    }
    
    console.log(`Found ${matchingRecords.length} matching record(s)`);
    console.log(`Match Type: ${matchType}, Match Logic: ${matchLogic}`);
    
    // Update each matching record
    for (const record of matchingRecords) {
        const updateData = {};
        
        updateFields.forEach((field, index) => {
            const convertedValue = convertValueForField(updateFieldValues[index], field.type);
            updateData[field.name] = convertedValue;
        });
        
        await table.updateRecordAsync(record, updateData);
        
        console.log(`Updated record ${record.id}`);
        updateFields.forEach((field, index) => {
            console.log(`  Set ${field.name} (${field.type}) to "${updateFieldValues[index]}" -> ${updateData[field.name]}`);
        });
    }
    
    console.log(`Successfully updated ${matchingRecords.length} record(s)`);
}

// Run the function
findAndUpdateRecords();
```

---

## Tips / Requirements
- **Field IDs vs Names:** Inputs expect **Field IDs**; the script resolves IDs to names internally.
- **Array or CSV:** All list inputs accept either arrays or comma-separated strings; order matters.
- **Type Conversion:** Update values are coerced based on target field type (`number`, `currency`, `checkbox`, `date`, or default string).
- **Partial Matching:** Uses case-insensitive substring on the stringified cell value.
- **Nulling Values:** Set an update value to an empty string to write `null` (clears the field).
- **Record Volume:** The script calls `selectRecordsAsync()` (loads all records). For very large tables, consider pagination or filters before scripting.

---

**Suggested filename:** `find-and-update-records-by-field-ids.md`
