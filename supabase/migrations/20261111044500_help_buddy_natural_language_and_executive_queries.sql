-- Improve Help Buddy recall for natural-language questions and executive role prompts.
-- Use OR-expanded, English-stemmed query terms so an extra word in a question
-- does not suppress an otherwise relevant article. Rank the matching terms
-- with length normalization and keep the per-entry confidence gate.
create or replace function public.help_buddy_search_qa(search_query text, max_results integer default 5)
returns table(
  entry_id uuid,
  question text,
  answer_markdown text,
  knowledge_base_id uuid,
  source_article_id uuid,
  intent_key text,
  rank_score real,
  confidence_threshold numeric
)
language sql
stable
set search_path to 'public'
as $function$
  with query_text as (
    select coalesce(
      (
        select string_agg(quote_literal(term) || ':*', ' | ')
        from unnest(tsvector_to_array(to_tsvector('english', coalesce(search_query, '')))) as term
      ),
      ''
    ) as value
  ),
  query_terms as (
    select case when value = '' then ''::tsquery else value::tsquery end as q
    from query_text
  )
  select
    e.id,
    e.question,
    e.answer_markdown,
    e.knowledge_base_id,
    e.source_article_id,
    e.intent_key,
    ts_rank(e.search_document, query_terms.q, 32) as rank_score,
    e.confidence_threshold
  from public.help_buddy_qa_entries e
  cross join query_terms
  where numnode(query_terms.q) > 0
    and e.status = 'published'
    and e.assistant_key = 'helpbuddy'
    and e.visibility <> 'assistant_private'
    and e.search_document @@ query_terms.q
  order by rank_score desc, e.updated_at desc
  limit greatest(1, least(coalesce(max_results, 5), 20));
$function$;

-- Give the executive talking-points article explicit natural-language prompts
-- for the leadership roles it covers. The existing search-refresh trigger
-- rebuilds its weighted search vector when alternate_questions changes.
update public.help_buddy_qa_entries e
set alternate_questions = (
  select array_agg(distinct prompt order by prompt)
  from unnest(
    coalesce(e.alternate_questions, '{}'::text[]) ||
    array[
      'What should the CFO say about IntelliStack financial oversight, cost transparency, ROI and value?',
      'What should the CEO say about IntelliStack strategy and organizational visibility?',
      'How should the COO explain operational efficiency, coordination and handoffs?',
      'What should the CIO and CTO say about IntelliSync integrations and platform architecture?',
      'What should the CISO say about IntelliStack permissions, governance, risk and security?',
      'What should the CHRO say about workforce experience, onboarding and employee coordination?'
    ]::text[]
  ) as prompt
)
where e.source_article_id in (
  select a.id
  from public.knowledge_articles a
  where a.slug = 'executive-talking-points-by-role'
)
and e.status = 'published';
