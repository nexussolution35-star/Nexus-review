# Rave

Rave: multi-tenant WhatsApp-first reputation + customer win-back platform for restaurants
(South Africa). Built by Nexus Solutions. Demo tenant: The Fireside Grill. Stack: Vite + React 18 + TypeScript +
Tailwind CSS + Recharts (frontend), Supabase (Postgres, Auth, RLS, Edge Functions,
cron) backend, GoHighLevel via webhooks for WhatsApp automation.

## Sources of truth, in order
1. `docs/PRD.md` — the full product spec. It always wins.
2. `reference/dashboard-v4.jsx` — an earlier working demo. Use it for the visual
   language (Fintech Trust palette, card style, layout patterns, seeded-data approach)
   but its features lag the PRD; PRD §2 lists the deltas.

## Hard rules
- Clean pages: charts and stat/KPI boxes ONLY under Statistics (Overview, Reviews, Staff).
- Exactly ONE global date control: From/To calendar pickers with a "From inception" reset.
  No sliders, no page-level date bars, no Days or Dine-context filters.
- UI copy: plain language, Grade 6, warm, and NO dashes ("Kitchen issue. Andile is on it.").
- One status chip per list item. Friendly empty states that name the next action.
- Palette: Fintech Trust (PRD §11 / reference file tokens); tenant brand colors may
  override accents.
- Multi-tenant from day one: every table has tenant_id; Supabase RLS enforces tenant and
  role (manager vs staff) isolation.
- Send batching: 10 contacts per minute per campaign; dedupe on phone number.

## Workflow preferences
- Work in small verifiable increments; run typecheck/build after each.
- Demo data must come from ONE seeded generator so all views stay consistent until
  Supabase is wired.
- Ask before adding dependencies beyond the stack above.
