-- Reflect the five implemented IntelliSphere workspace foundations in the app registry.
update public.intellisphere_apps
set status = 'in_development',
    launch_path = case app_key
      when 'intellinotes' then '/m/productivity-and-collaboration/intellistack-productivity-tools/intellinotes'
      when 'intellidrive' then '/m/productivity-and-collaboration/intellistack-productivity-tools/intellidrive'
      when 'intelliforms' then '/m/productivity-and-collaboration/intellistack-productivity-tools/intelliforms'
      when 'intellistudio' then '/m/productivity-and-collaboration/intellistack-productivity-tools/intellistudio'
      when 'intellitext' then '/m/productivity-and-collaboration/intellistack-productivity-tools/intellitext'
      else launch_path end,
    capabilities = case app_key
      when 'intellinotes' then '["private_notes","database_persistence","owner_scoped_rls","saved_note_search"]'::jsonb
      when 'intellidrive' then '["private_company_documents_bucket","owner_scoped_upload","signed_url_download","file_metadata_index"]'::jsonb
      when 'intelliforms' then '["form_definition_builder","database_persisted_forms","database_backed_submissions"]'::jsonb
      when 'intellistudio' then '["creative_project_briefs","database_persistence","project_search"]'::jsonb
      when 'intellitext' then '["business_message_templates","database_persistence","clipboard_copy"]'::jsonb
      else capabilities end
where app_key in ('intellinotes','intellidrive','intelliforms','intellistudio','intellitext');
