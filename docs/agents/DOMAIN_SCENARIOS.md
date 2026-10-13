# Domain scenarios and synthetic fixtures

These examples translate existing contracts into testable outcomes. They are synthetic, not records from Fastpik or evidence that Snappik tests pass. See [Business rules](../BUSINESS_RULES.md) and [Test plan](../TEST_PLAN.md) for authoritative definitions.

## Fixture vocabulary

Use deterministic fixture IDs in the implementation. Labels below are readable aliases, not valid UUID payloads for the API. Provider IDs are fake adapter values and must never be sent to the real Drive service.

| Alias | Fixture |
|---|---|
| Studio A / owner A | Active completed studio with a trial and its sole owner |
| Studio B / owner B | Separate active studio with a manual grant |
| Project A | Studio A project; main quota 3; main/download enabled |
| Photo A1 | Project A; provider `fake-drive-001`; `IMG_001.jpg`; folder `Original` |
| Photo A2 | Project A; provider `fake-drive-002`; `IMG_001.jpg`; folder `Edited` |
| Photo A3 | Project A; provider `fake-drive-003`; `IMG_001.JPG`; folder `Original` |
| Photo B1 | Studio B's project/photo, inaccessible through Studio A |
| Clock | Injected UTC instant; advance deterministically without wall-clock sleeps |

Generate safe test images locally during implementation or use licensed synthetic assets. Do not seed real phone numbers, client names, audit source folders or gallery tokens. Test dates are fixed fixtures rather than implicit references to today's date.

## Expected outcomes

| Scenario | Given / action | Required outcome | Tests |
|---|---|---|---|
| Same names, different files | Select A1, A2 and A3 | Count is 3; each has its own ID/note; export preserves folder, case and extension; none merge | T-007, T-011 |
| Cross-tenant substitution | Owner A requests B's result or a client submits B1 to Project A | Owner resource request returns scoped not-found; selection rejects foreign photo without leaking its metadata; no DB change | T-002 |
| Optional contacts | Create a valid project with no phone fields | Creation succeeds; no message is sent; no dummy number needed | T-004 |
| Confirmation below maximum | Quota 3; select A1 only and confirm saved revision | One-photo confirmation succeeds; quota is a maximum | T-009 |
| Quota overflow | Three selected; submit a fourth available project photo directly to API | Server rejects entire mutation; acknowledged previous three stay intact | T-007 |
| Concurrent edits | Tabs X/Y both read revision 7; X saves and obtains 8; Y saves with 7 | Y receives revision conflict; X's data persists; Y sees pending intent and retrieves canonical state | T-007 |
| Confirmation retry | Confirm revision 8 with key K; response lost; retry identical request/key with valid scope | Same confirmation ID/result; no extra snapshot; changing body under K conflicts | T-009 |
| Reopen history | Confirm A1/A2, then owner reopens with a reason | Choices remain; current lock cleared; selection revision advances; old snapshot unchanged; next confirmation adds history | T-010 |
| Failed inventory refresh | Last complete generation has A1/A2/A3; next scan fails after first page | Last complete generation remains visible; no false unavailable records; failure and last-sync time are visible | T-005 |
| Source removed | Complete successful scan no longer finds selected A2 | Draft still displays A2 as unavailable; confirmation blocked until explicitly removed; older snapshots retained | T-005, T-009 |
| Workflow independence | Main expires at 08:00 UTC; download expires at 10:00 UTC; clock is 09:00 UTC | Main reads/mutations denied; separately authorized download succeeds | T-012, T-013 |
| Exact deadline | Clock equals workflow expires_at | Deny; a previously issued cookie does not extend the deadline | T-012 |
| Expired owner entitlement | Trial ended; gallery workflow still has time | Owner can read/export/archive/revoke, cannot create/edit/resync/reopen; client follows independent gallery deadline | T-014 |
| Suspended studio | Operator suspends Studio A | Owner operational data and all client access denied; separate operator diagnostics still authorized; reactivation does not renew grants | T-012, T-015 |
| Lost create response | Server committed project/job; client never received 201 | Retry original key returns same project; no second quota consumption/job; recent projects provide recovery | T-004 |
| Archive and restore | Archive project, then restore within 30 days with capacity | Client access denied while archived; restore retains original deadlines and choices; stale grants remain invalid | T-019 |
| Operator permission split | Diagnostics-only operator attempts a manual entitlement grant | Denied; no change; authorized grant requires separate permission and reason with atomic audit | T-015 |
| Unsafe note/export value | Note contains HTML and a spreadsheet formula-like prefix | Render as text; export safely escaped/neutralized; original application note remains text | T-008, T-011, T-018 |

## Boundary fixtures

Exercise zero/one/quota/quota-plus-one selections; 500/501 Unicode code points; exactly-at and adjacent expiry instants; third/fourth active project race for the initial trial; 50 MiB and over-limit images; 5,000 and over-limit inventories; depth 10 and beyond; full and final partial pagination pages. Include empty folders and a project whose main workflow is disabled but downloads are enabled.

For Unicode notes use code points that occupy more than one UTF-16 code unit and combining sequences. The requirement counts code points, not visual grapheme clusters. Test the documented rule consistently in both client hint and server validation.

For races, use separate real PostgreSQL connections and synchronization barriers. Assert the allowed final persisted state, snapshot count and audit/job effects. A sequential test cannot demonstrate concurrency correctness.

## Example end-to-end evidence

An implementation run should record: synthetic owner login → setup → create Project A → successful inventory → client selection/note → confirmation → owner exact export → reopen → reconfirm → separate download → archive denial. Attach build identity, test environment and canonical fixture IDs. Report provider-backed and synthetic runs separately, including any missing device/provider coverage.
