create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text,
  email text,
  linkedin_url text,
  contact_number text,
  program text check (program in ('PGDM 27', 'PGDM 28', 'PGCM 27') or program is null),
  major_specialisation text,
  minor_specialisation text,
  can_help_with text[] default '{}',

  profile_photo_url text,
  is_private boolean default false,
  show_in_directory boolean default true,

  education jsonb default '[]'::jsonb,
  work_experience jsonb default '[]'::jsonb,
  internships jsonb default '[]'::jsonb,
  clubs jsonb default '[]'::jsonb,
  certifications jsonb default '[]'::jsonb,
  projects jsonb default '[]'::jsonb,
  publications jsonb default '[]'::jsonb,
  case_competitions jsonb default '[]'::jsonb,
  achievements jsonb default '[]'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
add column if not exists major_specialisation text,
add column if not exists minor_specialisation text;

alter table public.profiles enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "Great Lakes users can view directory profiles" on public.profiles;
drop policy if exists "Great Lakes users can view own profile" on public.profiles;
drop policy if exists "Great Lakes users can create own profile" on public.profiles;
drop policy if exists "Great Lakes users can update own profile" on public.profiles;
drop policy if exists "Great Lakes users can delete own profile" on public.profiles;

create policy "Great Lakes users can view directory profiles"
on public.profiles
for select
using (
  auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
  and show_in_directory = true
  and is_private = false
);

create policy "Great Lakes users can view own profile"
on public.profiles
for select
using (
  auth.uid() = id
  and auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
);

create policy "Great Lakes users can create own profile"
on public.profiles
for insert
with check (
  auth.uid() = id
  and auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
);

create policy "Great Lakes users can update own profile"
on public.profiles
for update
using (
  auth.uid() = id
  and auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
)
with check (
  auth.uid() = id
  and auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
);

create policy "Great Lakes users can delete own profile"
on public.profiles
for delete
using (
  auth.uid() = id
  and auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 1048576, array['image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Great Lakes users can upload own profile photos" on storage.objects;
drop policy if exists "Great Lakes users can update own profile photos" on storage.objects;
drop policy if exists "Great Lakes users can view profile photos" on storage.objects;

create policy "Great Lakes users can upload own profile photos"
on storage.objects
for insert
with check (
  bucket_id = 'profile-photos'
  and auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Great Lakes users can update own profile photos"
on storage.objects
for update
using (
  bucket_id = 'profile-photos'
  and auth.jwt() ->> 'email' like '%@greatlakes.edu.in'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Great Lakes users can view profile photos"
on storage.objects
for select
using (bucket_id = 'profile-photos');
