-- Fix Help Buddy knowledge retrieval ranking.
-- ts_rank_cd over long article vectors produced near-zero proximity scores,
-- even for exact, relevant matches. Use length-normalized ts_rank so the
-- existing per-entry confidence thresholds remain meaningful.
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
  with query_terms as (
    select websearch_to_tsquery('english', coalesce(search_query, '')) as q
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
