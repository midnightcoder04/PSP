# Contract — Testimonials API

Captures DB schema, RLS policies, and the supabase-js query patterns the frontend uses.

---

## 1. Table DDL

See `db/migrations/012_testimonials.sql` (to be authored during Phase 3):

```sql
create table public.testimonials (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.profiles(id)  on delete cascade,
  session_id      uuid not null references public.sessions(id)  on delete restrict,
  content         text not null check (length(content) between 50 and 1500),
  rating          int  null check (rating between 1 and 5),
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (participant_id, session_id)
);

create index testimonials_session_id_idx     on public.testimonials(session_id);
create index testimonials_participant_id_idx on public.testimonials(participant_id);

alter table public.testimonials enable row level security;

create policy testimonials_self_select on public.testimonials
  for select to authenticated
  using (participant_id = auth.uid());

create policy testimonials_self_insert on public.testimonials
  for insert to authenticated
  with check (participant_id = auth.uid());

create policy testimonials_self_update on public.testimonials
  for update to authenticated
  using (participant_id = auth.uid())
  with check (participant_id = auth.uid());

create policy testimonials_facilitator_select on public.testimonials
  for select to authenticated
  using (
    exists (select 1 from public.sessions s
            where s.id = testimonials.session_id
              and s.facilitator_id = auth.uid())
  );

create policy testimonials_admin_select on public.testimonials
  for select to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );

create trigger testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();
```

No DELETE policy is defined; deletions are not possible through the data API.

---

## 2. Participant — submit / update a testimonial

**Resolve session_id** (most recent active enrollment):

```ts
const { data: enrollment } = await supabase
  .from('enrollments')
  .select('session_id, enrolled_at')
  .eq('participant_id', profile.id)
  .eq('is_active', true)
  .order('enrolled_at', { ascending: false })
  .limit(1)
  .maybeSingle()

if (!enrollment) {
  // The participant is not enrolled in any session — show the testimonial form anyway
  // but block submission with a clear error message. Edge case for solo learners.
  return showError('No active session — please contact your facilitator.')
}
```

**Upsert testimonial**:

```ts
const { error } = await supabase
  .from('testimonials')
  .upsert(
    {
      participant_id: profile.id,
      session_id: enrollment.session_id,
      content,
      rating, // 1..5 or null
    },
    { onConflict: 'participant_id,session_id' }
  )
```

RLS allows insert + update via the `self_*` policies.

---

## 3. Participant — read own testimonial

```ts
const { data } = await supabase
  .from('testimonials')
  .select('id, content, rating, submitted_at, updated_at, session_id')
  .eq('participant_id', profile.id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

---

## 4. Facilitator — list testimonials for their sessions

```ts
const { data } = await supabase
  .from('testimonials')
  .select(`
    id,
    content,
    rating,
    submitted_at,
    participant:profiles!testimonials_participant_id_fkey ( display_name ),
    session:sessions ( id, title, facilitator_id )
  `)
  .order('submitted_at', { ascending: false })
```

RLS filters automatically via `testimonials_facilitator_select`.

---

## 5. Admin — list all testimonials with facilitator names

```ts
const { data } = await supabase
  .from('testimonials')
  .select(`
    id,
    content,
    rating,
    submitted_at,
    participant:profiles!testimonials_participant_id_fkey ( display_name, email ),
    session:sessions (
      id,
      title,
      facilitator:profiles!sessions_facilitator_id_fkey ( display_name )
    )
  `)
  .order('submitted_at', { ascending: false })
```

RLS filters automatically via `testimonials_admin_select`.

---

## 6. Integration test matrix

To be added to `scripts/rpc.test.ts` (or a sibling `scripts/testimonials.test.ts`):

| Caller role | Operation | Expected |
|-------------|-----------|----------|
| participant A | `select` own | ✓ row returned |
| participant A | `select` participant B's | ✗ empty result (RLS) |
| participant A | `insert` for self | ✓ |
| participant A | `insert` impersonating B (`participant_id = B.id`) | ✗ 403 (with-check) |
| participant A | `update` own | ✓ |
| participant A | `delete` own | ✗ 403 (no policy) |
| facilitator F | `select` testimonial for F's session | ✓ |
| facilitator F | `select` testimonial for another facilitator's session | ✗ empty |
| facilitator F | `insert` testimonial as themselves | ✗ (no self_insert match — facilitators aren't participants of the testimonial) |
| admin | `select` any | ✓ |
| admin | `update` someone else's | ✗ (no admin_update policy) |
| unauthenticated | any | ✗ |
