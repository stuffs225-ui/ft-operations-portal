# Excel Upload — Future BOQ/BOM Parser Design

## Current Phase (Phase 6)

In Phase 6, Excel files are stored as metadata only:
1. Factory user enters file name and type in the RMR wizard
2. File metadata is saved to `production_raw_material_request_files`
3. `parsing_status` is set to `pending_future_parser`
4. No actual parsing occurs in Phase 6

## Future Parser Architecture

When the Excel parser is implemented:

### Parsing Flow
```
Upload Excel File
  → Store in Supabase Storage (storage_path)
  → Queue parsing job (parsing_status = 'pending_future_parser')
  → Parser reads file (via Edge Function or background job)
  → Extract rows: item_code, item_name, description, quantity, unit, category
  → Insert rows into production_raw_material_request_items
  → Update parsing_status = 'parsed' (or 'failed')
  → Notify factory user
```

### Supported File Formats (planned)
- Excel .xlsx — primary format for BOQ/BOM
- Excel .xls — legacy support
- CSV — fallback

### Expected Column Structure (BOQ/BOM)
| Column | Field | Required |
|---|---|---|
| Item Code | item_code | No |
| Item Name / Description | item_name | Yes |
| Full Description | description | No |
| Quantity | quantity | Yes |
| Unit | unit | Yes |
| Category | material_category | No |
| Required For | required_for | No |

### Parsing Status
| Status | Meaning |
|---|---|
| not_parsed | File uploaded but parser not yet triggered |
| pending_future_parser | Parser feature not yet implemented |
| parsed | Successfully parsed — items in request_items table |
| failed | Parsing failed — check file format |

## Database Structure

`production_raw_material_request_items` is pre-structured to receive parsed data:
- Foreign key to `production_raw_material_request_files` via `raw_material_request_id`
- All item fields nullable (to support partial parsing)
- `vehicle_line_id` allows item-to-line assignment

## Implementation Notes

The parser should be implemented as a Supabase Edge Function triggered by a storage webhook when a file is uploaded to the `factory-rmr-files` bucket. This keeps parsing asynchronous and non-blocking.
