
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Role enum
CREATE TYPE public.app_role AS ENUM ('client', 'tasker', 'admin');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ user_roles ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- profiles policies
CREATE POLICY "profiles viewable by everyone"
  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "admins manage profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "users see own roles"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ tasker_profiles ============
CREATE TABLE public.tasker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  hourly_rate NUMERIC(10,2),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  location GEOGRAPHY(POINT, 4326),
  location_address TEXT,
  total_jobs INT NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX tasker_profiles_location_idx ON public.tasker_profiles USING GIST (location);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasker_profiles TO authenticated;
GRANT SELECT ON public.tasker_profiles TO anon;
GRANT ALL ON public.tasker_profiles TO service_role;
ALTER TABLE public.tasker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasker profiles public read"
  ON public.tasker_profiles FOR SELECT USING (TRUE);
CREATE POLICY "tasker insert own"
  ON public.tasker_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasker update own"
  ON public.tasker_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage tasker profiles"
  ON public.tasker_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ jobs ============
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  location_address TEXT,
  budget NUMERIC(12,2),
  scheduled_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX jobs_location_idx ON public.jobs USING GIST (location);
CREATE INDEX jobs_client_idx ON public.jobs (client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs public read pending/active"
  ON public.jobs FOR SELECT USING (status IN ('pending','active') OR auth.uid() = client_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clients create own jobs"
  ON public.jobs FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "clients update own jobs"
  ON public.jobs FOR UPDATE USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "clients delete own jobs"
  ON public.jobs FOR DELETE USING (auth.uid() = client_id);
CREATE POLICY "admins manage jobs"
  ON public.jobs FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ bookings ============
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tasker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','in_progress','completed','cancelled')),
  scheduled_date TIMESTAMPTZ,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','processing','paid','failed','refunded')),
  payment_method TEXT,
  mpesa_transaction_id TEXT,
  amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings visible to parties"
  ON public.bookings FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = tasker_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clients create bookings"
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "parties update bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = tasker_id)
  WITH CHECK (auth.uid() = client_id OR auth.uid() = tasker_id);
CREATE POLICY "admins manage bookings"
  ON public.bookings FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ reviews ============
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, reviewer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read"
  ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviewer creates review"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "reviewer updates own review"
  ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "admins manage reviews"
  ON public.reviews FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ messages ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX messages_booking_idx ON public.messages (booking_id, sent_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages visible to booking parties"
  ON public.messages FOR SELECT
  USING (EXISTS(
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (auth.uid() = b.client_id OR auth.uid() = b.tasker_id OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "party sends messages"
  ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS(
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (auth.uid() = b.client_id OR auth.uid() = b.tasker_id)
    )
  );

-- ============ notifications ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications read"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own notifications update"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ triggers ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tasker_profiles_updated BEFORE UPDATE ON public.tasker_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );

  chosen_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ nearby taskers RPC ============
CREATE OR REPLACE FUNCTION public.nearby_taskers(
  _lng DOUBLE PRECISION,
  _lat DOUBLE PRECISION,
  _radius_m DOUBLE PRECISION DEFAULT 10000,
  _category TEXT DEFAULT NULL,
  _min_rating NUMERIC DEFAULT 0,
  _max_rate NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[],
  category TEXT,
  hourly_rate NUMERIC,
  average_rating NUMERIC,
  total_jobs INT,
  is_available BOOLEAN,
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    tp.user_id,
    p.full_name,
    p.avatar_url,
    tp.bio,
    tp.skills,
    tp.category,
    tp.hourly_rate,
    tp.average_rating,
    tp.total_jobs,
    tp.is_available,
    ST_Distance(tp.location, ST_MakePoint(_lng, _lat)::geography) AS distance_meters
  FROM public.tasker_profiles tp
  JOIN public.profiles p ON p.id = tp.user_id
  WHERE tp.location IS NOT NULL
    AND ST_DWithin(tp.location, ST_MakePoint(_lng, _lat)::geography, _radius_m)
    AND (_category IS NULL OR tp.category = _category)
    AND tp.average_rating >= _min_rating
    AND (_max_rate IS NULL OR tp.hourly_rate <= _max_rate)
    AND COALESCE((SELECT is_suspended FROM public.profiles WHERE id = tp.user_id), FALSE) = FALSE
  ORDER BY distance_meters ASC
  LIMIT 100;
$$;

-- Realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
