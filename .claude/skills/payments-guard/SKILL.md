---
name: payments-guard
description: Use when a Majlis Ku change touches prices, plans, plan limits or quotas, checkout, the PaymentProvider interface or a gateway adapter, payment webhooks, receipts, invoices, or refunds. Keeps money correct and server-trusted.
---

# Payments Guard

Money mistakes cost real ringgit and trust. Check every item before design approval, before
edits, and again at verification.

## Prices and plans

- Prices and limits live in the `Plan` table, editable by admin. Code reads them from the database; it does not hard-code them.
- The checkout amount is computed on the server from the plan id. Never accept an amount from the client.
- Money is integer sen with currency `MYR`. Format for display only at the edge (`RM 40.00`).
- Plan limits (upload count, video allowed and length, storage, retention, e-card access) are enforced on the server when the presigned URL is issued and again when the upload is confirmed.

## Provider boundary

- All gateway calls go through the `PaymentProvider` interface in `src/server/payments/`. Domain code never imports a gateway SDK directly.
- Each adapter has a sandbox mode selected by env, and unit tests with recorded payloads.
- Adding or switching a gateway needs the developer's approval.

## Webhooks

- Verify the signature with the gateway's secret before parsing anything else. Reject on failure with no side effects.
- Idempotent: the provider's reference is unique on `Payment`; a duplicate delivery is a no-op that still returns success.
- Only a verified webhook (or a server-side status query to the gateway) marks a payment paid. The browser redirect only shows a "checking payment" page.
- Activate the plan for the event in the same database transaction that marks the payment paid.

## Receipts and refunds

- Every paid payment gets a receipt number from a database sequence, never reused.
- Refunds are admin-only, recorded on the `Payment`, and change the event's plan only after the gateway confirms.

## Tests

- Valid signature, invalid signature, duplicate delivery, amount mismatch, and unknown reference.
- Quota boundary: exactly at the limit, one over, and plan upgrade mid-event.
- A Playwright e2e test of the sandbox checkout.

## Common mistakes

- Trusting the `?status=paid` query string on the return URL.
- Floats for money.
- Enforcing the upload limit only in the UI.
