---
generated: 2026-05-11T16:16:07.206Z
project: okedskadkspeiyxjslqc
---

# Security Audit Report

**Generated**: 2026-05-11T16:16:07.206Z
**Project**: `okedskadkspeiyxjslqc`

---

## 1. Supabase Advisor Findings

### Security advisors

> ⚠️ Could not fetch security advisors: HTTP 401 Unauthorized — check SUPABASE_PAT (management API requires a Personal Access Token, not a service role key)

> Set `SUPABASE_PAT` in .env.local (Supabase Dashboard → Account → Access Tokens) to enable this section.

### Performance advisors

> ⚠️ Could not fetch performance advisors: HTTP 401 Unauthorized — check SUPABASE_PAT (management API requires a Personal Access Token, not a service role key)

> Set `SUPABASE_PAT` in .env.local (Supabase Dashboard → Account → Access Tokens) to enable this section.

---

## 2. RLS Access Matrix

| Table | Description | Op | Role | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| profiles | SELECT self | SELECT | admin | allow | allow | ✓ |
| profiles | SELECT self | SELECT | facilitator | allow | allow | ✓ |
| profiles | SELECT self | SELECT | participant | allow | allow | ✓ |
| profiles | SELECT other (own session) | SELECT | admin | allow | allow | ✓ |
| profiles | SELECT other (own session) | SELECT | facilitator | allow | allow | ✓ |
| profiles | UPDATE self display_name | UPDATE | admin | allow | allow | ✓ |
| profiles | UPDATE self display_name | UPDATE | facilitator | allow | allow | ✓ |
| profiles | UPDATE self display_name | UPDATE | participant | allow | allow | ✓ |
| sessions | SELECT (own/enrolled) | SELECT | admin | allow | allow | ✓ |
| sessions | SELECT (own/enrolled) | SELECT | facilitator | allow | allow | ✓ |
| sessions | SELECT (own/enrolled) | SELECT | participant | allow | allow | ✓ |
| sections | SELECT | SELECT | admin | allow | allow | ✓ |
| sections | SELECT | SELECT | participant | allow | allow | ✓ |
| exercises | SELECT | SELECT | facilitator | allow | allow | ✓ |
| responses | SELECT own | SELECT | participant | allow | allow | ✓ |
| responses | SELECT facilitator sees participant's | SELECT | facilitator | allow | allow | ✓ |
| enrollments | SELECT (own session) | SELECT | admin | allow | allow | ✓ |
| enrollments | SELECT (own session) | SELECT | facilitator | allow | allow | ✓ |
| enrollments | SELECT (own enrollment) | SELECT | participant | allow | allow | ✓ |
| progress | SELECT own | SELECT | admin | allow | allow | ✓ |
| progress | SELECT own | SELECT | participant | allow | allow | ✓ |
| progress | SELECT facilitator sees participant in own session | SELECT | facilitator | allow | allow | ✓ |

> ✓ All 22 RLS assertions passed.

---

## 3. Edge Function Authorization (`create-user`)

| Caller | Body email | Expected | Actual status | Actual body | Result |
|---|---|---|---|---|---|
| admin | __rpc_test_efnew_admin@example.invalid | HTTP 200 | HTTP 200 | {"user":{"id":"1c36eb69-cd08-411c-b863-cdbdca288b3f","email":"__rpc_test_efnew_a | ✓ |
| facilitator | __rpc_test_efnew_facilitator@example.invalid | HTTP 403 | HTTP 403 | {"error":"admin_required"} | ✓ |
| participant | __rpc_test_efnew_participant@example.invalid | HTTP 403 | HTTP 403 | {"error":"admin_required"} | ✓ |
| anon (no JWT) | __rpc_test_efnew_anon_(no_JWT)@example.invalid | HTTP 401 | HTTP 401 | {"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"} | ✓ |

> ✓ All edge-function authz assertions passed.

---

## 4. Build Sentinel Scan

Runs `scripts/check-no-bypass.sh` (includes sentinel checks for `__dev_auth_role__`,
`sb_secret_`, and `dev-(admin|facilitator|participant)-id`).

```
→ Building production bundle with VITE_DEV_BYPASS unset…

> rwpsp-course-platform@0.0.1 build
> tsc -b && vite build

vite v5.4.21 building for production...
transforming...
✓ 938 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                          0.53 kB │ gzip:   0.34 kB
dist/assets/Badge-BOKAaBfr.css                           0.58 kB │ gzip:   0.27 kB
dist/assets/ProgressRing-BYuLU9_a.css                    0.69 kB │ gzip:   0.35 kB
dist/assets/AdminDashboard-BkknUEsp.css                  0.89 kB │ gzip:   0.37 kB
dist/assets/FacilitatorDashboard-Aam7YXIi.css            1.08 kB │ gzip:   0.46 kB
dist/assets/CourseHistoryPage-D_BgX9dH.css               1.28 kB │ gzip:   0.48 kB
dist/assets/AdminSessionDetailPage-GJjnt2ID.css          1.30 kB │ gzip:   0.46 kB
dist/assets/FacilitatorSessionDetailPage-BT7pXcvf.css    1.33 kB │ gzip:   0.49 kB
dist/assets/Button-C-6Z1hzy.css                          1.65 kB │ gzip:   0.65 kB
dist/assets/LoginPage-D4-zih7d.css                       1.93 kB │ gzip:   0.66 kB
dist/assets/CourseHome-CPXSJm2t.css                      2.06 kB │ gzip:   0.71 kB
dist/assets/SessionsPage-DSN36s6H.css                    2.51 kB │ gzip:   0.76 kB
dist/assets/PageShell-DKc9j6mK.css                       2.54 kB │ gzip:   0.81 kB
dist/assets/UsersPage-C09ywAsw.css                       2.74 kB │ gzip:   0.83 kB
dist/assets/index-CLPa1PcL.css                           4.78 kB │ gzip:   1.72 kB
dist/assets/SectionPage-I2iwPUE3.css                    10.37 kB │ gzip:   2.12 kB
dist/assets/Badge-CxN0ADYV.js                            0.35 kB │ gzip:   0.25 kB
dist/assets/LoginPage.module-C90GNeOG.js                 0.49 kB │ gzip:   0.28 kB
dist/assets/Button-3WDZqRbj.js                           0.74 kB │ gzip:   0.45 kB
dist/assets/ProgressRing-DLTWb10X.js                     1.07 kB │ gzip:   0.60 kB
dist/assets/ResetPasswordPage-D3FlCmAp.js                1.69 kB │ gzip:   0.82 kB
dist/assets/LoginPage-QxZG1PoO.js                        2.13 kB │ gzip:   1.01 kB
dist/assets/PageShell-DZGucFO0.js                        2.18 kB │ gzip:   1.02 kB
dist/assets/CourseHistoryPage-BcqagVey.js                2.24 kB │ gzip:   1.11 kB
dist/assets/FacilitatorDashboard-Bg7WrTpO.js             2.33 kB │ gzip:   1.17 kB
dist/assets/FacilitatorSessionDetailPage-DY6IsTbu.js     2.81 kB │ gzip:   1.30 kB
dist/assets/AdminSessionDetailPage-7SRxQyAC.js           2.91 kB │ gzip:   1.20 kB
dist/assets/CourseHome-CNb9A6JZ.js                       3.55 kB │ gzip:   1.56 kB
dist/assets/SessionsPage-BoAiCUqX.js                     4.49 kB │ gzip:   1.71 kB
dist/assets/UsersPage-BdVBOM6m.js                        5.03 kB │ gzip:   1.97 kB
dist/assets/SectionPage-B8xH1g49.js                     12.33 kB │ gzip:   4.20 kB
dist/assets/AdminDashboard-BykjFUBC.js                 366.17 kB │ gzip: 101.43 kB
dist/assets/index-2ZkQX7No.js                          381.01 kB │ gzip: 109.96 kB
✓ built in 1.03s
→ Checking that VITE_DEV_BYPASS was not set at build time (active bypass gate)…
✓ no active dev-bypass flag
→ Scanning dist/ for Supabase secret-key values (pattern: sb_secret_[30+ chars])…
✓ no Supabase secret key values in bundle
→ Scanning dist/ for dev user-ID sentinels ('dev-(admin|facilitator|participant)-id')…
✓ no dev user-ID sentinels
✓ PASS — dist/ is clean.
```

> ✓ Sentinel scan passed.

---

## 5. Env-Var Policy

Checks that `src/vite-env.d.ts` does not declare `VITE_*SECRET*` or `VITE_*SERVICE_ROLE*`.
(Such declarations would inline server-only keys into the browser bundle.)

> ✓ No forbidden env-var declarations found in `src/vite-env.d.ts`.

---

## Summary

| Check | Status |
|---|---|
| Supabase advisors | see Section 1 |
| RLS matrix | ✓ all pass |
| Edge Function authz | ✓ all pass |
| Build sentinel | ✓ clean |
| Env-var policy | ✓ clean |
