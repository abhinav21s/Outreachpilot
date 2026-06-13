# Setup Guide

Follow these steps to get your OutreachPilot pipeline up and running.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

## 2. API Keys Configuration

Create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

Now, fill in your API keys for each service:

- **Apollo.io:** Get your API key from the [Apollo.io Settings](https://app.apollo.io/#/settings/api).
- **Prospeo.io:** Get your API key from the [Prospeo Dashboard](https://prospeo.io/dashboard/api).
- **Snov.io:** Get your Client ID and Client Secret from the [Snov.io API Settings](https://app.snov.io/account/settings/api).
- **Brevo:** Get your API key from the [Brevo SMTP & API Settings](https://app.brevo.com/settings/keys/api).

## 3. Configuration

Edit the `.env` file to customize your outreach:

- `SENDER_NAME`: Your name as it should appear in emails.
- `SENDER_EMAIL`: The verified email address you'll send from (must be verified in Brevo).
- `EMAIL_SUBJECT`: The subject line for your outreach emails.

### Testing without sending to prospects

If you want to test the full pipeline (including Brevo) without actually emailing the prospects, use the test script:

```bash
npm run test-email
```

**How it works:**
- **Main Pipeline (`npm start`)**: Sends emails to the **actual prospect emails** discovered during the process.
- **Test Script (`npm run test-email`)**: Intercepts all outgoing emails and redirects them to the `TEST_EMAIL_RECIPIENT` email address defined in your `.env`. 
- The test email will include a debug header showing who the original recipient was intended to be, along with the full personalized email body.

## 4. Usage

Run the pipeline with the following command:

```bash
npm start
```

You will be prompted to enter a seed company domain (e.g., `stripe.com`). The pipeline will then execute all stages and ask for your confirmation before sending the final emails.
