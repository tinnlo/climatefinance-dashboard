-- Enable RLS
alter table public.users enable row level security;

-- Allow read access for authenticated users
create policy "Allow read access for authenticated users"
on public.users for select
to authenticated
using (true);

-- Allow update access for admin users
-- Check the existing policies and update them if needed
drop policy if exists "Allow admins to update any user's data" on users;
drop policy if exists "Allow users to update their own data" on users;

-- Create a new unified update policy for admins
create policy "Allow admins to update any user's data"
on users for update 
to authenticated
using (
  -- Check if the user making the request has the admin role in the users table
  exists (
    select 1 
    from users 
    where id = auth.uid() 
    and role = 'admin'
  )
);

-- Verify the policy using:
select 
  auth.uid() as current_user_id,
  (select role from users where id = auth.uid()) as current_user_role,
  exists (
    select 1 
    from users 
    where id = auth.uid() 
    and role = 'admin'
  ) as is_admin;

-- Allow insert access for admin users
drop policy if exists "Allow insert access for admin users" on users;

-- Create a new insert policy that allows both:
-- 1. Admin users to insert new users
-- 2. New users to be created during registration
create policy "Allow user registration and admin inserts"
on public.users for insert
to authenticated
with check (
  -- Either the user is an admin
  (exists (
    select 1 
    from users 
    where id = auth.uid() 
    and role = 'admin'
  ))
  -- Or the new row's ID matches the authenticated user's ID (for registration)
  OR (id = auth.uid())
);

-- Allow delete access for admin users
create policy "Allow delete access for admin users"
on public.users for delete
to authenticated
using (auth.jwt() ->> 'role' = 'admin');

