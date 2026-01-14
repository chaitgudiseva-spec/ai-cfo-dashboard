# Google Sheets Setup Guide

## Step 1: Create Your Google Sheet

1. Go to https://sheets.google.com/
2. Create a new spreadsheet
3. Name it "AI CFO Dashboard Data"

## Step 2: Set Up Your Sheet Structure

Create a sheet called **"Deals"** with these columns (Row 1 = Headers):

| Deal Name | Amount | Stage | Close Date | Probability | Created Date |
|-----------|--------|-------|------------|-------------|--------------|
| Example Deal 1 | 50000 | Proposal | 2025-02-15 | 75 | 2025-01-01 |
| Example Deal 2 | 75000 | Negotiation | 2025-03-01 | 90 | 2025-01-05 |
| Example Deal 3 | 100000 | Qualified | 2025-02-28 | 50 | 2025-01-10 |

### Column Descriptions:

- **Deal Name**: Name of the deal/opportunity
- **Amount**: Dollar amount (just the number, no $ or commas)
- **Stage**: Current stage (e.g., "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost")
- **Close Date**: Expected close date (YYYY-MM-DD format)
- **Probability**: Win probability 0-100
- **Created Date**: When the deal was created (YYYY-MM-DD format)

## Step 3: Make Your Sheet Public (Read-Only)

1. Click **"Share"** button (top right)
2. Click **"Change to anyone with the link"**
3. Set permissions to **"Viewer"** (not Editor!)
4. Click **"Copy link"**
5. The link will look like:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
6. Copy the **SPREADSHEET_ID** part (the long string between `/d/` and `/edit`)

## Step 4: Get Google API Key

1. Go to https://console.cloud.google.com/
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Credentials**
4. Click **"+ CREATE CREDENTIALS"** → **"API key"**
5. Copy your API key (starts with `AIza...`)
6. Click **"Edit API key"** (optional but recommended)
7. Under **"API restrictions"**, select **"Restrict key"**
8. Check **"Google Sheets API"**
9. Click **"Save"**

## Step 5: Enable Google Sheets API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **"Google Sheets API"**
3. Click on it
4. Click **"Enable"**

## Step 6: Add to Vercel Environment Variables

You'll need to add two environment variables to Vercel:

1. `GOOGLE_SHEET_ID` - Your spreadsheet ID from Step 3
2. `GOOGLE_API_KEY` - Your API key from Step 4

I'll help you set these up via CLI once you have the values!

## Example Sheet Data

Here's sample data you can copy/paste into your sheet:

```
Deal Name,Amount,Stage,Close Date,Probability,Created Date
Acme Corp Enterprise,150000,Proposal,2025-02-15,75,2025-01-01
TechStart Startup,45000,Qualified,2025-03-01,50,2025-01-05
BigCo Integration,200000,Negotiation,2025-02-20,90,2024-12-15
SmallBiz Basic,25000,Proposal,2025-02-28,60,2025-01-10
MegaCorp Full Suite,500000,Qualified,2025-04-01,40,2025-01-08
```

Just paste this into your "Deals" sheet!

## Benefits of Google Sheets Approach

✅ Easy to update - just edit the spreadsheet
✅ No HubSpot integration needed
✅ Visual data management
✅ Can use Google Sheets formulas
✅ Share with team members for collaborative editing
✅ Free and simple
✅ Real-time updates to dashboard
