-- Help Buddy conversational knowledge, Q&A, feedback, unanswered queue and event-rule foundation.
create table if not exists public.help_buddy_qa_entries (
  id uuid primary key default gen_random_uuid(),
  assistant_key text not null default 'helpbuddy',
  knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,
  source_article_id uuid unique references public.knowledge_articles(id) on delete set null,
  intent_key text not null default 'knowledge_lookup',
  question text not null,
  alternate_questions text[] not null default '{}',
  answer_markdown text not null,
  tags text[] not null default '{}',
  visibility text not null default 'public_internal' check (visibility in ('public_internal','restricted','founder_only','assistant_private','tenant_private','personal')),
  status text not null default 'draft' check (status in ('draft','review','published','retired')),
  version integer not null default 1 check (version > 0),
  confidence_threshold numeric(5,4) not null default 0.1800 check (confidence_threshold between 0 and 1),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  search_document tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists help_buddy_qa_search_idx on public.help_buddy_qa_entries using gin(search_document);
create index if not exists help_buddy_qa_scope_idx on public.help_buddy_qa_entries(knowledge_base_id,status,assistant_key);
create index if not exists help_buddy_qa_intent_idx on public.help_buddy_qa_entries(intent_key,status);

create table if not exists public.help_buddy_unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assistant_sessions(id) on delete cascade,
  message_id uuid references public.assistant_messages(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  question text not null,
  normalized_question text not null,
  status text not null default 'open' check (status in ('open','under_review','answered','duplicate','closed')),
  linked_qa_entry_id uuid references public.help_buddy_qa_entries(id) on delete set null,
  resolution_notes text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists help_buddy_unanswered_scope_idx on public.help_buddy_unanswered_questions(profile_id,status,created_at desc);
create index if not exists help_buddy_unanswered_org_idx on public.help_buddy_unanswered_questions(organization_id,tenant_id,status,created_at desc);

create table if not exists public.help_buddy_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assistant_sessions(id) on delete cascade,
  message_id uuid not null references public.assistant_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating in (-1,1)),
  feedback_type text not null default 'answer_quality' check (feedback_type in ('answer_quality','accuracy','missing_source','tone','privacy_concern','other')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id,message_id)
);
create index if not exists help_buddy_feedback_message_idx on public.help_buddy_feedback(message_id);

create table if not exists public.help_buddy_event_rules (
  id uuid primary key default gen_random_uuid(),
  assistant_key text not null default 'helpbuddy',
  event_key text not null unique,
  event_label text not null,
  description text not null default '',
  source_system text not null,
  event_type text not null,
  response_template text not null,
  action_key text,
  requires_approval boolean not null default false,
  enabled boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','disabled')),
  organization_id uuid references public.organizations(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not enabled or status='active')
);
create index if not exists help_buddy_event_rules_enabled_idx on public.help_buddy_event_rules(source_system,event_type,status,enabled);

alter table public.assistant_sessions add column if not exists title text, add column if not exists channel text not null default 'workspace', add column if not exists last_activity_at timestamptz not null default now();
alter table public.assistant_messages add column if not exists message_kind text not null default 'chat' check (message_kind in ('chat','system_event','suggestion','tool_result','handoff','error')), add column if not exists intent_key text, add column if not exists confidence_score numeric(5,4) check (confidence_score is null or confidence_score between 0 and 1), add column if not exists retrieval_metadata jsonb not null default '{}'::jsonb, add column if not exists in_reply_to uuid references public.assistant_messages(id) on delete set null;

alter table public.help_buddy_qa_entries enable row level security;
alter table public.help_buddy_unanswered_questions enable row level security;
alter table public.help_buddy_feedback enable row level security;
alter table public.help_buddy_event_rules enable row level security;

drop policy if exists help_buddy_qa_read_authorized on public.help_buddy_qa_entries;
create policy help_buddy_qa_read_authorized on public.help_buddy_qa_entries for select to authenticated using (status='published' and visibility <> 'assistant_private' and public.kb_can_read_base(knowledge_base_id));
drop policy if exists help_buddy_qa_manage_authorized on public.help_buddy_qa_entries;
create policy help_buddy_qa_manage_authorized on public.help_buddy_qa_entries for all to authenticated using (public.kb_can_manage()) with check (public.kb_can_manage());
drop policy if exists help_buddy_unanswered_owner on public.help_buddy_unanswered_questions;
create policy help_buddy_unanswered_owner on public.help_buddy_unanswered_questions for all to authenticated using (profile_id=(select auth.uid())) with check (profile_id=(select auth.uid()) and exists(select 1 from public.assistant_sessions s where s.id=session_id and s.profile_id=(select auth.uid())));
drop policy if exists help_buddy_feedback_owner on public.help_buddy_feedback;
create policy help_buddy_feedback_owner on public.help_buddy_feedback for all to authenticated using (profile_id=(select auth.uid()) and exists(select 1 from public.assistant_sessions s where s.id=session_id and s.profile_id=(select auth.uid()))) with check (profile_id=(select auth.uid()) and exists(select 1 from public.assistant_sessions s where s.id=session_id and s.profile_id=(select auth.uid())));
drop policy if exists help_buddy_event_rules_read_active on public.help_buddy_event_rules;
create policy help_buddy_event_rules_read_active on public.help_buddy_event_rules for select to authenticated using (enabled=true and status='active');
drop policy if exists help_buddy_event_rules_manage_authorized on public.help_buddy_event_rules;
create policy help_buddy_event_rules_manage_authorized on public.help_buddy_event_rules for all to authenticated using (public.kb_can_manage()) with check (public.kb_can_manage());

create or replace function public.help_buddy_refresh_search_document() returns trigger language plpgsql set search_path=public as $$
begin
  new.search_document := setweight(to_tsvector('english',coalesce(new.question,'')),'A') ||
    setweight(to_tsvector('english',coalesce(array_to_string(new.alternate_questions,' '),'')),'B') ||
    setweight(to_tsvector('english',coalesce(new.answer_markdown,'')),'C') ||
    setweight(to_tsvector('english',coalesce(array_to_string(new.tags,' '),'')),'D');
  return new;
end; $$;
drop trigger if exists help_buddy_qa_search_refresh on public.help_buddy_qa_entries;
create trigger help_buddy_qa_search_refresh before insert or update of question,alternate_questions,answer_markdown,tags on public.help_buddy_qa_entries for each row execute function public.help_buddy_refresh_search_document();

create or replace function public.help_buddy_search_qa(search_query text,max_results integer default 5)
returns table(entry_id uuid,question text,answer_markdown text,knowledge_base_id uuid,source_article_id uuid,intent_key text,rank_score real,confidence_threshold numeric)
language sql stable security invoker set search_path=public as $$
  with query_terms as (select websearch_to_tsquery('english',coalesce(search_query,'')) q)
  select e.id,e.question,e.answer_markdown,e.knowledge_base_id,e.source_article_id,e.intent_key,ts_rank_cd(e.search_document,query_terms.q),e.confidence_threshold
  from public.help_buddy_qa_entries e cross join query_terms
  where numnode(query_terms.q)>0 and e.status='published' and e.assistant_key='helpbuddy'
    and e.visibility <> 'assistant_private' and e.search_document @@ query_terms.q
  order by 7 desc,e.updated_at desc limit greatest(1,least(coalesce(max_results,5),20));
$$;
grant execute on function public.help_buddy_search_qa(text,integer) to authenticated;

create or replace function public.help_buddy_touch_session() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.assistant_sessions set last_activity_at=now() where id=new.session_id; return new; end; $$;
drop trigger if exists assistant_messages_touch_session on public.assistant_messages;
create trigger assistant_messages_touch_session after insert on public.assistant_messages for each row execute function public.help_buddy_touch_session();

create or replace function public.help_buddy_sync_article_qa() returns trigger language plpgsql security definer set search_path=public as $$
declare base_visibility text;
begin
  select kb.visibility::text into base_visibility from public.knowledge_bases kb where kb.id=new.knowledge_base_id;
  insert into public.help_buddy_qa_entries(assistant_key,knowledge_base_id,source_article_id,intent_key,question,alternate_questions,answer_markdown,tags,visibility,status,approved_at,metadata,updated_at)
  values('helpbuddy',new.knowledge_base_id,new.id,'knowledge_lookup','What should I know about: '||new.title||'?',array['Tell me about '||new.title,'Find information about '||new.title],coalesce(new.body_md,''),array['knowledge article','knowledge lookup'],coalesce(new.visibility::text,base_visibility,'public_internal'),case when new.status='published' then 'published' when new.status='retired' then 'retired' else 'draft' end,new.published_at,jsonb_build_object('source','knowledge_articles','source_title',new.title),now())
  on conflict(source_article_id) do update set knowledge_base_id=excluded.knowledge_base_id,intent_key=excluded.intent_key,question=excluded.question,alternate_questions=excluded.alternate_questions,answer_markdown=excluded.answer_markdown,visibility=excluded.visibility,status=excluded.status,approved_at=excluded.approved_at,metadata=excluded.metadata,version=case when public.help_buddy_qa_entries.answer_markdown is distinct from excluded.answer_markdown or public.help_buddy_qa_entries.question is distinct from excluded.question then public.help_buddy_qa_entries.version+1 else public.help_buddy_qa_entries.version end,updated_at=now();
  return new;
end; $$;
drop trigger if exists knowledge_article_sync_help_buddy_qa on public.knowledge_articles;
create trigger knowledge_article_sync_help_buddy_qa after insert or update of knowledge_base_id,title,body_md,status,visibility,published_at on public.knowledge_articles for each row execute function public.help_buddy_sync_article_qa();

insert into public.help_buddy_qa_entries(assistant_key,knowledge_base_id,source_article_id,intent_key,question,alternate_questions,answer_markdown,tags,visibility,status,approved_at,metadata)
select 'helpbuddy',a.knowledge_base_id,a.id,'knowledge_lookup','What should I know about: '||a.title||'?',array['Tell me about '||a.title,'Find information about '||a.title],coalesce(a.body_md,''),array['knowledge article','knowledge lookup'],a.visibility::text,case when a.status='published' then 'published' when a.status='retired' then 'retired' else 'draft' end,a.published_at,jsonb_build_object('source','knowledge_articles','source_title',a.title)
from public.knowledge_articles a where a.status in ('published','draft','retired') on conflict(source_article_id) do nothing;

insert into public.help_buddy_event_rules(event_key,event_label,description,source_system,event_type,response_template,action_key,requires_approval,enabled,status) values
('ticket_assigned','Ticket assigned','A ticket is assigned to a user.','intellidesk','ticket.assigned','A ticket has been assigned to you. Review the request, confirm ownership, and open the ticket for details.','open_ticket',false,false,'draft'),
('ticket_status_changed','Ticket status changed','A ticket changes lifecycle status.','intellidesk','ticket.status_changed','The ticket status changed. Review the latest verified status and the next required action.','open_ticket',false,false,'draft'),
('workflow_checkpoint_completed','Workflow checkpoint completed','A workflow checkpoint is verified complete.','workflow_center','checkpoint.completed','A workflow checkpoint has been verified as complete. Review the next step and its owner.','open_workflow',false,false,'draft'),
('approval_requested','Approval requested','An approval is awaiting an authorized approver.','workflow_center','approval.requested','An approval is waiting for your review. Open the approval record to inspect its details and evidence.','open_approval',true,false,'draft'),
('task_overdue','Task overdue','A task passes its due time while still open.','workflow_center','task.overdue','A task appears overdue. Review its owner, due time, and available next steps.','open_task',false,false,'draft'),
('security_event','Security event raised','A security event requires authorized review.','security_center','security.event','A security event requires attention. Open the authorized incident record and follow the approved response process.','open_security_event',true,false,'draft')
on conflict(event_key) do nothing;

create or replace function public.help_buddy_touch_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists help_buddy_qa_updated_at on public.help_buddy_qa_entries;
create trigger help_buddy_qa_updated_at before update on public.help_buddy_qa_entries for each row execute function public.help_buddy_touch_updated_at();
drop trigger if exists help_buddy_unanswered_updated_at on public.help_buddy_unanswered_questions;
create trigger help_buddy_unanswered_updated_at before update on public.help_buddy_unanswered_questions for each row execute function public.help_buddy_touch_updated_at();
drop trigger if exists help_buddy_feedback_updated_at on public.help_buddy_feedback;
create trigger help_buddy_feedback_updated_at before update on public.help_buddy_feedback for each row execute function public.help_buddy_touch_updated_at();
drop trigger if exists help_buddy_event_rules_updated_at on public.help_buddy_event_rules;
create trigger help_buddy_event_rules_updated_at before update on public.help_buddy_event_rules for each row execute function public.help_buddy_touch_updated_at();
