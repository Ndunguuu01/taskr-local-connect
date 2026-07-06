
CREATE OR REPLACE FUNCTION public.create_job(
  _title text, _description text, _category text, _budget numeric,
  _location_address text, _lat double precision, _lng double precision,
  _scheduled_date timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _job_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.jobs (client_id, title, description, category, budget, location_address, location, scheduled_date)
  VALUES (_uid, _title, _description, _category, _budget, _location_address,
          ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography, _scheduled_date)
  RETURNING id INTO _job_id;
  RETURN _job_id;
END; $$;

CREATE OR REPLACE FUNCTION public.upsert_tasker_profile(
  _bio text, _category text, _skills text[], _hourly_rate numeric,
  _is_available boolean, _location_address text,
  _lat double precision, _lng double precision
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.tasker_profiles (user_id, bio, category, skills, hourly_rate, is_available, location_address, location)
  VALUES (_uid, _bio, _category, COALESCE(_skills, ARRAY[]::text[]), _hourly_rate, _is_available, _location_address,
          ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography)
  ON CONFLICT (user_id) DO UPDATE
    SET bio = EXCLUDED.bio, category = EXCLUDED.category, skills = EXCLUDED.skills,
        hourly_rate = EXCLUDED.hourly_rate, is_available = EXCLUDED.is_available,
        location_address = EXCLUDED.location_address, location = EXCLUDED.location,
        updated_at = now()
  RETURNING id INTO _id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'tasker') ON CONFLICT DO NOTHING;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_job_public(_job_id uuid)
RETURNS TABLE (
  id uuid, title text, description text, category text, budget numeric, status text,
  location_address text, lat double precision, lng double precision,
  scheduled_date timestamptz, created_at timestamptz, client_id uuid, client_name text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id, j.title, j.description, j.category, j.budget, j.status, j.location_address,
         ST_Y(j.location::geometry), ST_X(j.location::geometry),
         j.scheduled_date, j.created_at, j.client_id, p.full_name
  FROM public.jobs j LEFT JOIN public.profiles p ON p.id = j.client_id
  WHERE j.id = _job_id;
$$;

CREATE OR REPLACE FUNCTION public.get_tasker_public(_user_id uuid)
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text, bio text, category text,
  skills text[], hourly_rate numeric, is_available boolean, location_address text,
  lat double precision, lng double precision, average_rating numeric, total_jobs int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.user_id, p.full_name, p.avatar_url, t.bio, t.category, t.skills, t.hourly_rate,
         t.is_available, t.location_address,
         ST_Y(t.location::geometry), ST_X(t.location::geometry),
         t.average_rating, t.total_jobs
  FROM public.tasker_profiles t LEFT JOIN public.profiles p ON p.id = t.user_id
  WHERE t.user_id = _user_id;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasker_profiles_user_id_key') THEN
    ALTER TABLE public.tasker_profiles ADD CONSTRAINT tasker_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.create_job(text, text, text, numeric, text, double precision, double precision, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_tasker_profile(text, text, text[], numeric, boolean, text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tasker_public(uuid) TO anon, authenticated;
