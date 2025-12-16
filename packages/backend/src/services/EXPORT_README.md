# Export Service

The Export Service provides functionality to export contacts, properties, and deals in various formats (CSV, Excel, vCard).

## Features

- **Contact Export**: Export contacts with names, emails, phones, roles, associated properties, and relationship notes
- **Property Export**: Export properties with addresses, vendor information, contacts, stages, and milestones
- **Deal Export**: Export deals with stages, participants, property references, timeline summaries, next actions, and risk flags
- **Multiple Formats**: Support for CSV, Excel (XLSX), and vCard (contacts only)
- **Selective Export**: Export all records or only selected records by ID

## API Endpoints

### Create Export Job

```
POST /api/export/contacts
POST /api/export/properties
POST /api/export/deals
```

**Request Body:**
```json
{
  "format": "csv" | "xlsx" | "vcard",
  "recordIds": ["id1", "id2"] // Optional, for selective export
}
```

**Response:**
```json
{
  "exportId": "uuid",
  "status": "pending",
  "message": "Export job created. Use the exportId to check status and download."
}
```

### Get Export Status

```
GET /api/export/:id
```

**Response:**
```json
{
  "id": "uuid",
  "fileUrl": "/api/export/:id/download",
  "recordCount": 42,
  "status": "completed" | "pending" | "processing" | "failed"
}
```

### Download Export File

```
GET /api/export/:id/download
```

**Response:**
```json
{
  "downloadUrl": "/api/export/:id/download",
  "recordCount": 42
}
```

## Export Formats

### CSV Format

All exports support CSV format with comma-separated values. Fields containing commas, quotes, or newlines are properly escaped.

**Contact CSV Columns:**
- Name
- Email Addresses (semicolon-separated)
- Phone Numbers (semicolon-separated)
- Role
- Associated Properties (semicolon-separated)
- Relationship Notes (pipe-separated)

**Property CSV Columns:**
- Address
- Vendor Names (semicolon-separated)
- Vendor Emails (semicolon-separated)
- Associated Contacts (semicolon-separated)
- Stage
- Campaign Milestones (pipe-separated)
- Risk Overview

**Deal CSV Columns:**
- Property Address
- Stage
- Participants (semicolon-separated)
- Next Action
- Next Action Owner
- Risk Level
- Risk Flags (semicolon-separated)
- Timeline Summary
- Created Date
- Updated Date

### Excel Format (XLSX)

Currently returns CSV format. In production, this would use a library like `exceljs` to generate actual Excel files with formatting, multiple sheets, and formulas.

### vCard Format

Only available for contacts. Generates standard vCard 3.0 format with:
- Full Name (FN)
- Name (N)
- Email addresses (EMAIL;TYPE=WORK/HOME)
- Phone numbers (TEL;TYPE=WORK/CELL)
- Organization/Role (ORG)
- Notes (NOTE)

## Implementation Details

### Asynchronous Processing

Export generation is asynchronous:
1. Client creates export job → receives exportId immediately
2. Server processes export in background
3. Client polls status endpoint to check completion
4. Client downloads file when status is "completed"

### Data Fetching

The service fetches data with all necessary relations:
- Contacts: includes vendor properties and buyer properties
- Properties: includes vendors, buyers, and deals
- Deals: includes property and contacts

### Selective Export

When `recordIds` array is provided, only those specific records are exported. This allows users to:
- Export a subset of contacts for a specific campaign
- Export properties in a particular area
- Export deals at a specific stage

### File Storage

Currently returns placeholder URLs. In production:
- Files would be uploaded to S3 or similar object storage
- Signed URLs would be generated for secure downloads
- Files would expire after a certain period (e.g., 24 hours)

## Future Enhancements

1. **Real Excel Generation**: Use `exceljs` library for proper XLSX files
2. **S3 Integration**: Upload files to S3 and generate signed URLs
3. **Email Delivery**: Option to email export files
4. **Scheduled Exports**: Recurring exports on a schedule
5. **Custom Templates**: User-defined export templates
6. **Compression**: ZIP files for large exports
7. **Progress Tracking**: Real-time progress updates via WebSocket
8. **Export History**: Track and list previous exports
