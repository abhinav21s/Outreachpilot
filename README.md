# OutreachPilot 🚀

A fully automated cold outreach CLI pipeline built with Node.js.

## Overview

OutreachPilot automates the entire process of finding similar companies, identifying decision-makers, resolving their verified work emails, and sending personalized outreach emails—all from a single seed domain input.

## Pipeline Stages

1.  **Apollo.io (Lookalike Discovery):** Finds companies with similar industry and firmographics based on your seed domain.
2.  **Prospeo (Decision Maker Identification):** Searches for C-suite and VP-level contacts at the discovered companies.
3.  **Snov.io (Email Resolution):** Resolves and verifies real work email addresses for each contact.
4.  **Brevo (Personalized Outreach):** Sends automated, personalized emails to verified contacts.

## Features

- **Fully Automated:** Single input starts the entire 4-stage process.
- **Safety First:** Shows a summary table of all contacts for confirmation before sending emails.
- **Modular Architecture:** Clean, readable code divided into logical API modules.
- **Graceful Error Handling:** Logs errors and continues processing without crashing.
- **Environment Driven:** Securely handles API keys via `.env`.

## Quick Start

```bash
npm install
# Configure your .env file
npm start
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).
