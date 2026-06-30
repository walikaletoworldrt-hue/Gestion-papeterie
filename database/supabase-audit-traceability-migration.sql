alter table public.audit_logs
add column if not exists actor_name text;

alter table public.audit_logs
add column if not exists actor_username text;

alter table public.audit_logs
add column if not exists source_device text;

alter table public.audit_logs
add column if not exists source_platform text;

update public.audit_logs a
set actor_name = u.full_name
from public.users u
where a.user_id = u.id
  and a.actor_name is null;

update public.audit_logs a
set actor_username = u.username
from public.users u
where a.user_id = u.id
  and a.actor_username is null;

update public.audit_logs
set source_platform = 'legacy'
where source_platform is null;

update public.audit_logs
set source_device = 'Poste inconnu'
where source_device is null;
