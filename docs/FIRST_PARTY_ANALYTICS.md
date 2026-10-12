# First-party heatmaps and race-operations upgrade

This branch keeps Little Doo Mud Bog a single-track site. It does not add signup, tenants,
subscriptions, series/championship scoring, staff roles, offline scoring, or new scoring modes.

## Heatmap tracking boundary

Tracked public paths are allowlisted in `src/lib/analytics/policy.ts`:

- `/`
- `/events`
- `/classes`
- `/track`
- `/race-results`
- `/race-results/records`
- one-segment public race result pages below `/race-results/`
- `/sponsors`

Everything else fails closed. In particular, the tracker and ingestion API reject admin, API,
contact, gallery/upload, privacy, booking, checkout, payment, login, account, contract,
customer, order, rental, registration, profile, and unknown routes. The tracker is also disabled
for signed-in users, iframe previews, local development by default, Global Privacy Control, and
Do Not Track.

The tracker does not register input, change, or keyboard listeners. It ignores form controls,
forms, editable content, and elements marked `data-analytics-private`. Labels are accepted only
from explicit `data-heatmap-label` attributes and are sanitized again by the server.

## Coordinate model

Every click and sampled movement stores document and viewport pixels, normalized document
ratios, event-time document and viewport dimensions, device class, an optional stable element
anchor, element-relative offsets, and fixed/sticky context. The admin preview renders the real
site at a recorded device width and scales the complete browser viewport only for display.
Element anchors are projected against the iframe DOM first; coordinate scaling is the fallback.
The overlay subtracts the iframe's real scroll position from projected document Y.

## Database and access

The migrations are additive and isolated:

- `202610120001_race_operations.sql` adds race revisions, class snapshots, optional stable racer
  IDs, immutable official result versions, atomic save/publish/create/class-toggle functions, and
  guarded deletion.
- `202610120002_first_party_heatmaps.sql` adds dedicated analytics session, pageview,
  interaction, section, attention, and site-version tables.

No booking, contact, customer, order, rental, or payment table is changed. Analytics tables have
RLS enabled, no anonymous table privileges, admin-only select policies, and server-only ingestion
through a privileged key. That key must never be exposed with a `NEXT_PUBLIC_` prefix.

Raw data can be purged with the admin-only `purge_expired_web_analytics()` function. The default
retention argument is 120 days. Scheduling that function is intentionally left to the existing
operations environment; this branch does not enable a new paid service or database extension.

## Required configuration before enabling

1. Apply both migrations through the project's normal reviewed migration process.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in the server deployment environment.
3. Set stable `ANALYTICS_SITE_VERSION` and `ANALYTICS_LAYOUT_VERSION` values (a deployment SHA
   is a good site version; increment layout version when page geometry materially changes).
4. Set `ANALYTICS_ALLOWED_ORIGIN` to the canonical site origin.
5. Keep `NEXT_PUBLIC_ANALYTICS_IN_DEVELOPMENT=false` outside intentional local testing.

Until the migrations and server-only key are present, analytics API calls fail closed with no
effect on public pages. Race RPC features similarly require the race migration before this branch
can replace production.
