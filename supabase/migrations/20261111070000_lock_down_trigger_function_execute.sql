-- Security hardening: trigger-only SLA functions are not public RPC endpoints.
-- PostgreSQL invokes trigger functions through their owning trigger; callers do not
-- need EXECUTE privileges on the trigger function itself.
REVOKE EXECUTE ON FUNCTION public.initialize_ticket_sla() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_ticket_first_response() FROM PUBLIC, anon, authenticated;
