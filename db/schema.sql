
create table commands (
  id uuid primary key default gen_random_uuid(),
  type text,
  value text,
  status text,
  created_at bigint
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  text text,
  created_at bigint default extract(epoch from now())
);
