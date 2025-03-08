create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  sender_id text not null,
  receiver_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- Create a policy that allows all operations for now (you may want to restrict this later)
create policy "Allow all operations for now" on public.messages
  for all
  using (true)
  with check (true);