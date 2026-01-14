# AI CFO Dashboard - Google Sheets Version

A simplified AI CFO dashboard that pulls data directly from Google Sheets. No HubSpot integration needed!

## ✨ Features

- 📊 Real-time data from Google Sheets
- 💰 Pipeline metrics (total value, average deal size, win rate)
- 📈 Pipeline by stage chart
- 📋 Top 10 deals table
- 🔄 One-click data refresh
- 🎨 Clean, modern UI

## 🚀 Quick Start

### 1. Create Your Google Sheet

1. Go to https://sheets.google.com/ and create a new spreadsheet
2. Name it "AI CFO Dashboard Data"
3. Create a sheet called "Deals" with these columns:

| Deal Name | Amount | Stage | Close Date | Probability | Created Date |
|-----------|--------|-------|------------|-------------|--------------|

4. Add your data (see GOOGLE-SHEETS-SETUP.md for examples)
5. Make the sheet public (Share → Anyone with link → Viewer)
6. Copy the Spreadsheet ID from the URL

### 2. Get Google API Key

1. Go to https://console.cloud.google.com/
2. Create/select a project
3. Enable "Google Sheets API"
4. Create API Key (Credentials → Create → API Key)
5. Copy the API key

### 3. Deploy to Vercel

Run these commands:

```bash
cd "/Users/chait/Library/Mobile Documents/com~apple~CloudDocs/Docs/ai-cfo-sheets"

# Login to Vercel
npx vercel login

# Deploy
npx vercel --prod

# Add environment variables
npx vercel env add GOOGLE_SHEET_ID production
# Paste your Spreadsheet ID when prompted

npx vercel env add GOOGLE_API_KEY production
# Paste your API Key when prompted

# Redeploy with environment variables
npx vercel --prod
```

### 4. Done!

Your dashboard will be live at the URL Vercel provides!

## 📝 Google Sheet Format

### Required Columns (in order):

1. **Deal Name** - Name of the opportunity
2. **Amount** - Dollar amount (numbers only, no $ or commas)
3. **Stage** - Current stage (Qualified, Proposal, Negotiation, Closed Won, Closed Lost)
4. **Close Date** - Expected close date (YYYY-MM-DD format)
5. **Probability** - Win probability (0-100)
6. **Created Date** - Deal creation date (YYYY-MM-DD format)

### Example Data:

```
Deal Name,Amount,Stage,Close Date,Probability,Created Date
Acme Corp Enterprise,150000,Proposal,2025-02-15,75,2025-01-01
TechStart Startup,45000,Qualified,2025-03-01,50,2025-01-05
BigCo Integration,200000,Negotiation,2025-02-20,90,2024-12-15
```

## 📊 Dashboard Metrics

- **Total Pipeline Value** - Sum of all open deals
- **Average Deal Size** - Average amount of open deals
- **Win Rate** - Percentage of closed deals that were won
- **Pipeline by Stage** - Bar chart showing value by stage
- **Top 10 Deals** - Largest deals in your pipeline

## 🔧 Updating Data

Just edit your Google Sheet! The dashboard has a "Refresh Data" button to pull the latest changes.

## 🆚 Comparison with HubSpot Version

**Google Sheets Version (This One):**
- ✅ Simpler setup
- ✅ Free (no HubSpot subscription needed)
- ✅ Easy data entry in spreadsheet
- ✅ Visual data management
- ✅ No authentication needed
- ❌ Manual data entry required

**HubSpot Version:**
- ✅ Automatic data sync
- ✅ Part of existing CRM workflow
- ✅ More detailed deal properties
- ❌ Requires HubSpot subscription
- ❌ More complex setup
- ❌ Needs HubSpot token management

## 📚 Documentation

- `GOOGLE-SHEETS-SETUP.md` - Detailed Google Sheets setup guide
- `README.md` - This file

## 🎯 Next Steps

1. Set up your Google Sheet with sample data
2. Deploy to Vercel
3. View your dashboard!
4. Update your sheet as deals progress
