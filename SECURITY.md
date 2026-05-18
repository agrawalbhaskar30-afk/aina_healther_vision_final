# Security Policy

## Sensitive Data Rules

Never commit:

- API keys or service tokens.
- Supabase JWT secrets or anon/service role keys.
- Real patient images, videos, names, MRNs, phone numbers, or chart data.
- Hospital network diagrams, VPN configs, camera credentials, or RTSP URLs.
- Raw clinical prompts or model outputs containing PHI.

Use `.env.example` files with placeholder values only.

## Secret Rotation

Rotate a secret immediately if it appears in:

- A screenshot.
- A screen recording.
- Chat history.
- A PR diff.
- Local logs.
- A model prompt or response.

## Vulnerability Reporting

During early private development, report issues directly to the repository owner. Before public adoption, add a dedicated security email, disclosure timeline, and supported-version matrix.
