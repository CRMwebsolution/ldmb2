# LDMB2 logic restoration and rollout plan

This branch is a reviewable implementation against `CRMwebsolution/ldmb2`. It is not merged or deployed. The supplied race Supabase project is `shxpqufymaxwvwamlmmz`. No database schema or data changes were made.

## What the audit found

- The new repository already has `/admin` routes for races, results, classes, rules, and sponsors. The important gaps were authorization and behavior: the UI had no admin allowlist check; the separate rules editor targeted the legacy `rules` table, while the public page reads `class_catalog.rules`; new race nights did not inherit active catalog classes.
- `/leaderboard` flattened every class and treated `order_num` (entry order) as a finishing position. It had no race archive, event detail, class mode, or downloadable results PDF.
- Admin result math used `parseFloat` on both passes. A distance such as `108.9ft` could be treated as a time, and the computed fields could remain stale or be manually overwritten.
- A hardcoded race could drive a stale countdown; UTC dates could put a race on the wrong local day. Mock sponsor, gallery, and results data and a ticket CTA suggested features or records that were not real.
- The contact form acknowledged a message without sending it. The gallery in the existing LDMB site uses a separate Supabase project and a pending approval workflow.
- A read-only snapshot of the supplied race project had 14 races, 108 race classes, 596 results, 20 catalog classes, 9 legacy rule rows, and 6 sponsors. The current schema already supports published results, date slugs, schedule visibility, admin RLS, and class catalog rules. No migration is needed for this branch.

## Order of changes

| Order | Change | Branch status | Safety gate |
| --- | --- | --- | --- |
| 1 | Preserve the existing schema and use `races`, `classes`, `results`, `class_catalog`, and `sponsors` as their current source of truth. Keep the legacy `rules` table intact for older consumers. | Done | No SQL migration or live writes. |
| 2 | Put pass parsing and scoring in one shared module: completed time beats stopped distance; lower time, longer distance; two valid times yield absolute consistency to three decimals; DQ does not become a time. Calculate derived fields when the admin saves either pass. | Done | Focused tests for formats, ordering, and edge cases pass. |
| 3 | Gate admin screens with the existing `is_current_race_admin` RPC. Seed active catalog classes for a newly created draft race; keep publication in the results workflow; block accidental class removal if it contains entries. Point rules editing at `class_catalog.rules`. | Done | Authorized and unauthorized login flows still need a manual preview check. Live test writes should use a staging project or a controlled draft only. |
| 4 | Restore a year → race → class results path and class mode ordering. Accept the existing slug or race ID. Restrict public detail to published races, paginate result reads, and offer a multi-page official PDF. Keep `/leaderboard` as a redirect for existing links. | Done | Review a published event and compare its HTML/PDF to the existing LDMB site, including DQ/distance and long classes. |
| 5 | Use scheduled future races in the track timezone for the schedule and countdown. Read current catalog and sponsors instead of mock records. Remove online ticket/registration promises; admission and racer participation remain on site. | Done | Verify event cards and copy against an upcoming race before rollout. |
| 6 | Connect the contact form to the existing webhook and expose a gallery adapter for the existing separate gallery project, including approved photos and pending submissions. | Branch code done; configuration and controlled integration checks remain. | Supply the existing gallery project's public URL/anon key in preview. Test webhook delivery and gallery moderation without using the race project for gallery data. |
| 7 | Review in a preview deployment, then merge and release only after the gates above. Keep a quick rollback to the previous site deployment. | Pending | `npm run build` and `npm test` pass locally; the repository-wide lint has pre-existing violations and should be cleaned separately. No production release has occurred. |

## Compatibility and open decisions

- This branch only reads the current tables and uses the same inserts/updates the old admin workflow used. New races begin unpublished. It does not rewrite historic results, rename columns, remove tables, alter RLS, or modify stored values.
- `first_half` and `second_half` remain the database columns. The UI labels them first and second pass. Name matching in the admin racer history is explicitly an estimate because historic rows lack stable racer IDs; Foot Runners are excluded from that estimate.
- Gallery credentials for the original site's separate project are not in this repository. The branch shows a neutral unavailable state until those public credentials are configured; the contact webhook is based on the existing LDMB source and needs a controlled delivery test before release.
- The results page deliberately shows values and class ordering without awarding positions from `order_num`. Official tie/place policy and a durable racer identity model would need separate product decisions before adding ranks or registrations.
- No online ticket purchase or online racer registration flow is proposed. If those are requested later, they require their own payment, identity, capacity, refund, and operations decisions before UI work.
