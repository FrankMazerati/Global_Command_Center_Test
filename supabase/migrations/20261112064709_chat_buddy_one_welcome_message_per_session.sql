create unique index if not exists assistant_messages_chat_buddy_welcome_per_session_idx
on public.assistant_messages (session_id)
where intent_key = 'chat_buddy_welcome_v1';
