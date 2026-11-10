-- Help Buddy Intelligence Management foundation
-- Supabase PostgreSQL + pgvector; safe to re-run after the live schema rollout.

create schema if not exists extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.help_buddy_library_categories (
  id uuid primary key default gen_random_uuid(),
  category_key text not null unique,
  name text not null,
  description text not null default '',
  parent_category_id uuid references public.help_buddy_library_categories(id) on delete set null,
  target_patterns integer not null default 0 check (target_patterns >= 0),
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.help_buddy_response_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.help_buddy_library_categories(id) on delete restrict,
  intent_key text not null,
  title text not null,
  user_examples text[] not null default '{}',
  response_variants jsonb not null default '[]'::jsonb,
  follow_up_variants jsonb not null default '[]'::jsonb,
  tone text not null default 'friendly',
  audience text not null default 'all',
  repeat_policy text not null default 'rotate',
  cooldown_turns integer not null default 3 check (cooldown_turns >= 0),
  requires_permission_check boolean not null default false,
  escalation_level text,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  visibility text not null default 'internal' check (visibility in ('internal','organization','tenant','private')),
  organization_id uuid references public.organizations(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  version integer not null default 1,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  embedding extensions.vector(384),
  embedding_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.help_buddy_memory_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  memory_scope text not null default 'user' check (memory_scope in ('user','organization','tenant')),
  memory_type text not null check (memory_type in ('preference','fact','decision','commitment','project_context','workflow_context','conversation_summary','other')),
  title text not null,
  content text not null,
  source_session_id uuid references public.assistant_sessions(id) on delete set null,
  source_message_id uuid references public.assistant_messages(id) on delete set null,
  importance smallint not null default 3 check (importance between 1 and 5),
  confidence numeric(4,3) not null default 0.800 check (confidence between 0 and 1),
  status text not null default 'active' check (status in ('active','superseded','expired','archived')),
  expires_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer not null default 0,
  embedding extensions.vector(384),
  embedding_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_buddy_memory_owner_scope_check check (
    (memory_scope = 'user' and profile_id is not null)
    or (memory_scope = 'organization' and organization_id is not null)
    or (memory_scope = 'tenant' and tenant_id is not null)
  )
);

create table if not exists public.help_buddy_memory_events (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references public.help_buddy_memory_records(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('created','retrieved','updated','superseded','expired','archived','deleted','corrected')),
  event_detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.help_buddy_response_usage (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.assistant_sessions(id) on delete cascade,
  response_template_id uuid references public.help_buddy_response_templates(id) on delete set null,
  intent_key text not null,
  variant_index integer not null default 0,
  used_at timestamptz not null default now()
);

create table if not exists public.help_buddy_management_audit (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('category','response_template','qa_scenario')),
  entity_id uuid not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  old_record jsonb,
  new_record jsonb,
  created_at timestamptz not null default now()
);

alter table public.help_buddy_qa_entries add column if not exists embedding extensions.vector(384);
alter table public.help_buddy_qa_entries add column if not exists embedding_model text;
alter table public.knowledge_articles add column if not exists embedding extensions.vector(384);
alter table public.knowledge_articles add column if not exists embedding_model text;

create index if not exists help_buddy_response_templates_embedding_hnsw
  on public.help_buddy_response_templates using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index if not exists help_buddy_memory_records_embedding_hnsw
  on public.help_buddy_memory_records using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index if not exists help_buddy_qa_entries_embedding_hnsw
  on public.help_buddy_qa_entries using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index if not exists knowledge_articles_embedding_hnsw
  on public.knowledge_articles using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;
create index if not exists help_buddy_memory_records_owner_idx
  on public.help_buddy_memory_records(profile_id, status, updated_at desc);
create index if not exists help_buddy_response_templates_category_idx
  on public.help_buddy_response_templates(category_id, status, intent_key);
create index if not exists help_buddy_response_usage_recent_idx
  on public.help_buddy_response_usage(profile_id, intent_key, used_at desc);

alter table public.help_buddy_library_categories enable row level security;
alter table public.help_buddy_response_templates enable row level security;
alter table public.help_buddy_memory_records enable row level security;
alter table public.help_buddy_memory_events enable row level security;
alter table public.help_buddy_response_usage enable row level security;
alter table public.help_buddy_management_audit enable row level security;

drop policy if exists "help buddy active categories readable" on public.help_buddy_library_categories;
create policy "help buddy active categories readable" on public.help_buddy_library_categories
  for select to authenticated using (status = 'active' or public.kb_can_manage());
drop policy if exists "help buddy categories insert by admins" on public.help_buddy_library_categories;
create policy "help buddy categories insert by admins" on public.help_buddy_library_categories for insert to authenticated with check (public.kb_can_manage());
drop policy if exists "help buddy categories update by admins" on public.help_buddy_library_categories;
create policy "help buddy categories update by admins" on public.help_buddy_library_categories for update to authenticated using (public.kb_can_manage()) with check (public.kb_can_manage());
drop policy if exists "help buddy categories delete by admins" on public.help_buddy_library_categories;
create policy "help buddy categories delete by admins" on public.help_buddy_library_categories for delete to authenticated using (public.kb_can_manage());

drop policy if exists "help buddy published responses readable" on public.help_buddy_response_templates;
create policy "help buddy published responses readable" on public.help_buddy_response_templates
  for select to authenticated using (
    (status = 'published' and
      (visibility = 'internal'
       or (visibility = 'organization' and organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid()))
       or (visibility = 'tenant' and tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid()))))
    or public.kb_can_manage()
  );
drop policy if exists "help buddy responses insert by admins" on public.help_buddy_response_templates;
create policy "help buddy responses insert by admins" on public.help_buddy_response_templates for insert to authenticated with check (public.kb_can_manage());
drop policy if exists "help buddy responses update by admins" on public.help_buddy_response_templates;
create policy "help buddy responses update by admins" on public.help_buddy_response_templates for update to authenticated using (public.kb_can_manage()) with check (public.kb_can_manage());
drop policy if exists "help buddy responses delete by admins" on public.help_buddy_response_templates;
create policy "help buddy responses delete by admins" on public.help_buddy_response_templates for delete to authenticated using (public.kb_can_manage());

drop policy if exists "users read own help buddy memories" on public.help_buddy_memory_records;
create policy "users read own help buddy memories" on public.help_buddy_memory_records for select to authenticated using (profile_id = (select auth.uid()) or public.kb_can_manage());
drop policy if exists "users create own help buddy memories" on public.help_buddy_memory_records;
create policy "users create own help buddy memories" on public.help_buddy_memory_records for insert to authenticated with check (profile_id = (select auth.uid()) and memory_scope = 'user');
drop policy if exists "users update own help buddy memories" on public.help_buddy_memory_records;
create policy "users update own help buddy memories" on public.help_buddy_memory_records for update to authenticated using (profile_id = (select auth.uid()) or public.kb_can_manage()) with check (profile_id = (select auth.uid()) or public.kb_can_manage());
drop policy if exists "users delete own help buddy memories" on public.help_buddy_memory_records;
create policy "users delete own help buddy memories" on public.help_buddy_memory_records for delete to authenticated using (profile_id = (select auth.uid()) or public.kb_can_manage());

drop policy if exists "users read own memory events" on public.help_buddy_memory_events;
create policy "users read own memory events" on public.help_buddy_memory_events for select to authenticated using (profile_id = (select auth.uid()) or public.kb_can_manage());
drop policy if exists "users read own response usage" on public.help_buddy_response_usage;
create policy "users read own response usage" on public.help_buddy_response_usage for select to authenticated using (profile_id = (select auth.uid()) or public.kb_can_manage());
drop policy if exists "help buddy users log own response usage" on public.help_buddy_response_usage;
create policy "help buddy users log own response usage" on public.help_buddy_response_usage for insert to authenticated with check (profile_id = (select auth.uid()));

drop policy if exists "help buddy admins read management audit" on public.help_buddy_management_audit;
create policy "help buddy admins read management audit" on public.help_buddy_management_audit for select to authenticated using (public.kb_can_manage());
drop policy if exists "help buddy admins append management audit" on public.help_buddy_management_audit;
create policy "help buddy admins append management audit" on public.help_buddy_management_audit for insert to authenticated with check (public.kb_can_manage());

drop policy if exists help_buddy_qa_read_authorized on public.help_buddy_qa_entries;
create policy help_buddy_qa_read_authorized on public.help_buddy_qa_entries for select to authenticated using (
  (status = 'published' and visibility <> 'assistant_private' and public.kb_can_read_base(knowledge_base_id))
  or public.kb_can_manage()
);
drop policy if exists help_buddy_qa_insert_authorized on public.help_buddy_qa_entries;
create policy help_buddy_qa_insert_authorized on public.help_buddy_qa_entries for insert to authenticated with check (public.kb_can_manage());
drop policy if exists help_buddy_qa_update_authorized on public.help_buddy_qa_entries;
create policy help_buddy_qa_update_authorized on public.help_buddy_qa_entries for update to authenticated using (public.kb_can_manage()) with check (public.kb_can_manage());
drop policy if exists help_buddy_qa_delete_authorized on public.help_buddy_qa_entries;
create policy help_buddy_qa_delete_authorized on public.help_buddy_qa_entries for delete to authenticated using (public.kb_can_manage());

create or replace function public.help_buddy_match_memories(
  query_embedding extensions.vector(384), match_count integer default 8, match_threshold real default 0.70
)
returns table (id uuid, memory_type text, title text, content text, importance smallint, confidence numeric, similarity real, updated_at timestamptz)
language sql stable security invoker set search_path = public, extensions
as $$
  select m.id,m.memory_type,m.title,m.content,m.importance,m.confidence,
    (1 - (m.embedding <=> query_embedding))::real,m.updated_at
  from public.help_buddy_memory_records m
  where m.profile_id = (select auth.uid()) and m.memory_scope = 'user' and m.status = 'active'
    and (m.expires_at is null or m.expires_at > now()) and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) >= match_threshold
  order by m.embedding <=> query_embedding limit greatest(1,least(match_count,30));
$$;

create or replace function public.help_buddy_match_responses(
  query_embedding extensions.vector(384), match_count integer default 8, match_threshold real default 0.70
)
returns table (id uuid, category_id uuid, intent_key text, title text, response_variants jsonb, follow_up_variants jsonb, tone text, repeat_policy text, cooldown_turns integer, similarity real)
language sql stable security invoker set search_path = public, extensions
as $$
  select r.id,r.category_id,r.intent_key,r.title,r.response_variants,r.follow_up_variants,r.tone,r.repeat_policy,r.cooldown_turns,
    (1 - (r.embedding <=> query_embedding))::real
  from public.help_buddy_response_templates r
  join public.help_buddy_library_categories c on c.id=r.category_id and c.status='active'
  where r.status='published' and
    (r.visibility='internal'
      or (r.visibility='organization' and r.organization_id=(select p.organization_id from public.profiles p where p.id=auth.uid()))
      or (r.visibility='tenant' and r.tenant_id=(select p.tenant_id from public.profiles p where p.id=auth.uid())))
    and r.embedding is not null and 1 - (r.embedding <=> query_embedding) >= match_threshold
  order by r.embedding <=> query_embedding limit greatest(1,least(match_count,30));
$$;

grant execute on function public.help_buddy_match_memories(extensions.vector,integer,real) to authenticated;
grant execute on function public.help_buddy_match_responses(extensions.vector,integer,real) to authenticated;

create or replace function public.help_buddy_touch_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end;
$$;

drop trigger if exists help_buddy_categories_touch_updated_at on public.help_buddy_library_categories;
create trigger help_buddy_categories_touch_updated_at before update on public.help_buddy_library_categories for each row execute function public.help_buddy_touch_updated_at();
drop trigger if exists help_buddy_responses_touch_updated_at on public.help_buddy_response_templates;
create trigger help_buddy_responses_touch_updated_at before update on public.help_buddy_response_templates for each row execute function public.help_buddy_touch_updated_at();
drop trigger if exists help_buddy_memories_touch_updated_at on public.help_buddy_memory_records;
create trigger help_buddy_memories_touch_updated_at before update on public.help_buddy_memory_records for each row execute function public.help_buddy_touch_updated_at();

create or replace function public.help_buddy_log_library_change()
returns trigger language plpgsql security invoker set search_path=public as $$
declare before_row jsonb; after_row jsonb; entity text; entity_uuid uuid;
begin
  entity := case tg_table_name when 'help_buddy_library_categories' then 'category'
    when 'help_buddy_response_templates' then 'response_template' else 'qa_scenario' end;
  if tg_op='INSERT' then after_row:=to_jsonb(new); entity_uuid:=(after_row->>'id')::uuid;
  elsif tg_op='UPDATE' then before_row:=to_jsonb(old); after_row:=to_jsonb(new); entity_uuid:=(after_row->>'id')::uuid;
  else before_row:=to_jsonb(old); entity_uuid:=(before_row->>'id')::uuid; end if;
  insert into public.help_buddy_management_audit(entity_type,entity_id,operation,actor_profile_id,old_record,new_record)
  values(entity,entity_uuid,tg_op,auth.uid(),before_row,after_row);
  if tg_op='DELETE' then return old; end if; return new;
end;
$$;

drop trigger if exists help_buddy_categories_audit on public.help_buddy_library_categories;
create trigger help_buddy_categories_audit after insert or update or delete on public.help_buddy_library_categories for each row execute function public.help_buddy_log_library_change();
drop trigger if exists help_buddy_responses_audit on public.help_buddy_response_templates;
create trigger help_buddy_responses_audit after insert or update or delete on public.help_buddy_response_templates for each row execute function public.help_buddy_log_library_change();
drop trigger if exists help_buddy_qa_audit on public.help_buddy_qa_entries;
create trigger help_buddy_qa_audit after insert or update or delete on public.help_buddy_qa_entries for each row execute function public.help_buddy_log_library_change();

insert into public.help_buddy_library_categories(category_key,name,description,target_patterns,sort_order)
values
 ('greetings','Greetings and Introductions','Opening exchanges, introductions and returning-user greetings.',250,10),
 ('time_based_greetings','Time-Based Greetings','Good morning, afternoon, evening and time-aware greetings.',150,20),
 ('small_talk','Everyday Small Talk','Natural casual conversation, interests, daily check-ins and light conversation.',500,30),
 ('playful_humor','Playful Questions and Humor','Jokes, playful banter, witty replies and lighthearted exchanges.',250,40),
 ('silly_imaginative','Silly and Imaginative Questions','Absurd, hypothetical, creative and unusual questions answered respectfully.',200,50),
 ('compliments','Compliments and Appreciation','Responses to praise, encouragement and positive feedback.',100,60),
 ('gratitude','Thanks and Acknowledgments','Varied ways to acknowledge thanks and appreciation.',100,70),
 ('farewells','Goodbyes and Farewells','Conversation endings, sign-offs and return invitations.',100,80),
 ('repetition','Repeated Questions','Recognize repeated questions and rotate contextual follow-ups.',150,90),
 ('clarification','Clarification and Misunderstanding','Ask useful clarifying questions and recover from misunderstandings.',150,100),
 ('frustration','Frustration and Reassurance','De-escalation, accountability, empathy and repair.',150,110),
 ('off_topic','Off-Topic Conversations','Handle unrelated questions without losing context or being dismissive.',150,120),
 ('encouragement','Encouragement and Motivation','Supportive and confidence-building responses.',100,130),
 ('workplace_tone','Professional Workplace Conversation','Professional, concise and role-aware workplace exchanges.',150,140),
 ('permission_denials','Permission and Access Denials','Explain access boundaries without disclosing restricted information.',250,150),
 ('admin_escalations','Administrator Escalations','Direct users to local, tenant, global administrators or security governance.',250,160),
 ('unsupported_requests','Unsupported Requests and Limitations','Explain unavailable capabilities and offer safe alternatives.',100,170),
 ('personality_rules','Personality and Tone Adaptation','Adapt formality, warmth, humor and response style to context.',1000,180),
 ('memory_awareness','Memory and Conversation Awareness','Remember context, recognize returning topics and continue conversations.',1000,190),
 ('conversation_transitions','Conversation Transitions','Change topics, return to tasks and gracefully resume work.',100,200)
on conflict (category_key) do update set name=excluded.name,description=excluded.description,target_patterns=excluded.target_patterns,sort_order=excluded.sort_order,updated_at=now();

-- Starter response examples are drafts until reviewed and published by a knowledge administrator.
insert into public.help_buddy_response_templates(category_id,intent_key,title,user_examples,response_variants,follow_up_variants,tone,audience,repeat_policy,cooldown_turns,requires_permission_check,escalation_level,status,visibility)
select c.id,v.intent_key,v.title,v.user_examples,v.responses::jsonb,v.followups::jsonb,v.tone,v.audience,v.repeat_policy,v.cooldown,v.permission_check,v.escalation,'draft','internal'
from (values
 ('greetings','greeting.hello','General hello',array['Hello','Hi Buddy','Hey there'],'["Hello! Good to see you. What can I help you with today?","Hey there! I’m here and ready when you are. What’s on your mind?","Hi! Welcome back. What would you like to work on?"]','["Are we picking up something from earlier, or starting something new?"]','friendly','all','rotate',3,false,null),
 ('time_based_greetings','greeting.morning','Morning greeting',array['Good morning','Morning Buddy'],'["Good morning! I hope your day is starting smoothly. What can I help you tackle?","Morning! I’m ready to help you get a good start on the day."]','["Would you like to pick up where you left off?"]','friendly','all','rotate',4,false,null),
 ('small_talk','smalltalk.how_are_you','How are you',array['How are you?','How is your day going?'],'["I’m doing well and ready to help. How are things going on your side?","All systems are looking good from my side. How can I make your day easier?"]','["Anything interesting happening today?"]','friendly','all','rotate',4,false,null),
 ('playful_humor','playful.tell_joke','Tell a joke',array['Tell me a joke','Make me laugh'],'["Why did the computer go to the doctor? It had a virus and needed a byte of rest.","I told my database a joke. It didn’t laugh, but it did return a few records."]','["Want another one, or should I save my comedy career?"]','playful','all','rotate',5,false,null),
 ('silly_imaginative','silly.can_you_fly','Can you fly',array['Can you fly?','Do you have wings?'],'["Not quite! I can navigate information, but I haven’t been issued wings.","No wings yet. I’m better at helping you get projects off the ground."]','["What made you wonder that?"]','playful','all','rotate',5,false,null),
 ('compliments','compliment.thanks_great','Compliment response',array['You are awesome','Nice work Buddy'],'["Thank you! I’m glad I could help.","I appreciate that. I’ll keep working to make things easier for you."]','["What shall we tackle next?"]','warm','all','rotate',4,false,null),
 ('gratitude','gratitude.thank_you','Thank you',array['Thanks','Thank you'],'["You’re welcome! Happy to help.","Anytime. That’s what I’m here for."]','["Would you like help with the next step?"]','friendly','all','rotate',3,false,null),
 ('farewells','farewell.goodbye','Goodbye',array['Goodbye','See you later'],'["Take care! I’ll be here when you need me.","See you next time. Have a good one!"]','["Is there anything you want to leave open for next time?"]','friendly','all','rotate',4,false,null),
 ('repetition','repeat.same_question','Repeated question',array['Can you answer that again?','I asked you already'],'["I recognize we’ve covered this already. Would you like me to explain it differently?","We’re back to this question. I can give you a shorter answer or walk through it another way."]','["Would a step-by-step explanation help?"]','patient','all','contextual',2,false,null),
 ('clarification','clarify.ambiguous','Unclear request',array['What do you mean?','Can you clarify?'],'["I may have misunderstood. Which part should I focus on?","Let me make sure I understand before I give you the wrong answer."]','["Are you asking where to find it, how to use it, or how to change it?"]','patient','all','rotate',3,false,null),
 ('frustration','frustration.repair','User frustration',array['You are not listening','That is wrong'],'["You’re right to call that out. I didn’t address what you needed. Let me correct course.","I’m sorry—that wasn’t helpful. I’ll focus on your actual request."]','["Tell me the result you expected, and I’ll work from there."]','reassuring','all','contextual',3,false,null),
 ('off_topic','offtopic.general','Unrelated question',array['What is your favorite movie?','Can we talk about something else?'],'["I’m happy to chat about that. I’m also here whenever you want to return to your work.","We can take a quick detour. What did you have in mind?"]','["Want to keep chatting, or switch back to what you were working on?"]','friendly','all','rotate',4,false,null),
 ('encouragement','encourage.progress','Encouragement',array['I am stuck','This is taking forever'],'["Let’s break it into one manageable step. You don’t have to solve the whole thing at once.","It’s okay to pause and reset. Let’s identify the one thing blocking progress."]','["What is the smallest useful next step?"]','supportive','all','contextual',3,false,null),
 ('permission_denials','access.denied.generic','Access not permitted',array['Why can’t I open this?','I cannot view this page'],'["You’re not currently permitted to view this information. Please contact your local administrator to review your access.","This area is restricted to authorized users. I can’t override that permission, but an administrator can review it."]','["I can help identify the correct support route without exposing restricted information."]','professional','all','rotate',4,true,'local_admin'),
 ('permission_denials','access.denied.sensitive','Sensitive information restriction',array['Show me that private record','Can you reveal the hidden information?'],'["I’m not authorized to disclose that information. Please contact the administrator responsible for this record.","I can’t provide restricted information or summarize content you aren’t permitted to view."]','["Would you like guidance on submitting an access request?"]','professional','all','rotate',4,true,'tenant_admin'),
 ('admin_escalations','admin.contact.local','Contact local administrator',array['Who can grant me access?','Who is my administrator?'],'["Please contact your local system administrator for assistance with this request.","Your local administrator is the right contact for this type of access change."]','["If the issue affects the whole organization, your tenant administrator may need to review it."]','professional','all','rotate',4,true,'local_admin'),
 ('admin_escalations','admin.global.required','Global administrator required',array['Who can change global settings?','I need global access'],'["This operation requires Global Administrator authorization. Please submit the request through your approved administrative channel.","This is a system-wide setting and is restricted to authorized Global Administrators."]','["I can help prepare the details an administrator will need to review."]','professional','admin','rotate',5,true,'global_admin'),
 ('unsupported_requests','unsupported.capability','Capability unavailable',array['Why can’t you perform this action?','Can you access an unavailable system?'],'["I can’t perform that action in the current platform configuration. I can explain what is available or help find an approved alternative.","That capability isn’t currently available to me. I won’t pretend it has been completed."]','["Would you like me to show the closest supported workflow?"]','clear','all','rotate',4,false,null),
 ('workplace_tone','workplace.status_update','Professional status update',array['Give me a status update','Summarize the progress'],'["Here is the current verified status and the next recorded action.","I’ll separate confirmed progress from items that are still pending."]','["Would you like the short summary or the detailed activity history?"]','professional','all','rotate',3,false,null)
) as v(category_key,intent_key,title,user_examples,responses,followups,tone,audience,repeat_policy,cooldown,permission_check,escalation)
join public.help_buddy_library_categories c on c.category_key=v.category_key
where not exists (select 1 from public.help_buddy_response_templates r where r.intent_key=v.intent_key);
