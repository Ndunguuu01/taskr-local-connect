
-- updated_at trigger for bookings
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS bookings_touch_updated_at ON public.bookings;
CREATE TRIGGER bookings_touch_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Create a booking (client only). Sets job to 'assigned'.
CREATE OR REPLACE FUNCTION public.create_booking(
  _job_id uuid, _tasker_id uuid, _amount numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _client uuid; _job_status text; _bid uuid; _title text; _cname text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT client_id, status, title INTO _client, _job_status, _title FROM public.jobs WHERE id=_job_id;
  IF _client IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF _client <> auth.uid() THEN RAISE EXCEPTION 'Only the job owner can book'; END IF;
  IF _job_status <> 'open' THEN RAISE EXCEPTION 'Job is not open'; END IF;

  INSERT INTO public.bookings (job_id, client_id, tasker_id, status, amount)
  VALUES (_job_id, _client, _tasker_id, 'pending', _amount) RETURNING id INTO _bid;

  UPDATE public.jobs SET status='assigned' WHERE id=_job_id;

  SELECT full_name INTO _cname FROM public.profiles WHERE id=_client;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_tasker_id, 'booking_request',
    'New booking request', COALESCE(_cname,'A client') || ' requested you for: ' || _title,
    '/booking/' || _bid::text);

  RETURN _bid;
END $$;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid,uuid,numeric) TO authenticated;

-- Update booking status. Allowed transitions kept simple.
CREATE OR REPLACE FUNCTION public.update_booking_status(_booking_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD; _other uuid; _msg text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() <> b.client_id AND auth.uid() <> b.tasker_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _status NOT IN ('pending','accepted','declined','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.bookings SET status=_status WHERE id=_booking_id;

  -- Side effects
  IF _status='declined' OR _status='cancelled' THEN
    UPDATE public.jobs SET status='open' WHERE id=b.job_id AND status='assigned';
  ELSIF _status='completed' THEN
    UPDATE public.jobs SET status='completed' WHERE id=b.job_id;
    UPDATE public.tasker_profiles
      SET total_jobs = COALESCE(total_jobs,0) + 1,
          total_earnings = COALESCE(total_earnings,0) + COALESCE(b.amount,0)
      WHERE user_id = b.tasker_id;
  END IF;

  _other := CASE WHEN auth.uid()=b.client_id THEN b.tasker_id ELSE b.client_id END;
  _msg := 'Booking status is now ' || _status;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_other, 'booking_update', 'Booking updated', _msg, '/booking/' || _booking_id::text);
END $$;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid,text) TO authenticated;

-- Send a message in a booking thread
CREATE OR REPLACE FUNCTION public.send_message(_booking_id uuid, _content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD; _mid uuid; _other uuid; _sname text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(coalesce(trim(_content),''))=0 THEN RAISE EXCEPTION 'Empty message'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF auth.uid() <> b.client_id AND auth.uid() <> b.tasker_id THEN RAISE EXCEPTION 'Not allowed'; END IF;

  INSERT INTO public.messages (booking_id, sender_id, content)
  VALUES (_booking_id, auth.uid(), _content) RETURNING id INTO _mid;

  _other := CASE WHEN auth.uid()=b.client_id THEN b.tasker_id ELSE b.client_id END;
  SELECT full_name INTO _sname FROM public.profiles WHERE id=auth.uid();
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_other, 'message', COALESCE(_sname,'New message'), left(_content,140),
          '/booking/' || _booking_id::text);
  RETURN _mid;
END $$;
GRANT EXECUTE ON FUNCTION public.send_message(uuid,text) TO authenticated;

-- Mark messages from the other party as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
  IF b.id IS NULL THEN RETURN; END IF;
  IF auth.uid() <> b.client_id AND auth.uid() <> b.tasker_id THEN RETURN; END IF;
  UPDATE public.messages SET read_at=now()
   WHERE booking_id=_booking_id AND sender_id <> auth.uid() AND read_at IS NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

-- Create a review (only after booking completed, only parties)
CREATE OR REPLACE FUNCTION public.create_review(_booking_id uuid, _rating int, _comment text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD; _reviewee uuid; _rid uuid; _avg numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Rating must be 1-5'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.status <> 'completed' THEN RAISE EXCEPTION 'Booking not completed yet'; END IF;
  IF auth.uid() <> b.client_id AND auth.uid() <> b.tasker_id THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id=_booking_id AND reviewer_id=auth.uid()) THEN
    RAISE EXCEPTION 'You already reviewed this booking';
  END IF;

  _reviewee := CASE WHEN auth.uid()=b.client_id THEN b.tasker_id ELSE b.client_id END;
  INSERT INTO public.reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
  VALUES (_booking_id, auth.uid(), _reviewee, _rating, _comment) RETURNING id INTO _rid;

  -- Recompute tasker average
  SELECT AVG(rating)::numeric(3,2) INTO _avg FROM public.reviews WHERE reviewee_id=_reviewee;
  UPDATE public.tasker_profiles SET average_rating=COALESCE(_avg,0) WHERE user_id=_reviewee;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_reviewee, 'review', 'New review', 'You received a ' || _rating || '-star review',
          '/booking/' || _booking_id::text);
  RETURN _rid;
END $$;
GRANT EXECUTE ON FUNCTION public.create_review(uuid,int,text) TO authenticated;

-- Mark notification read
CREATE OR REPLACE FUNCTION public.mark_notification_read(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.notifications SET is_read=true WHERE id=_id AND user_id=auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.notifications SET is_read=true WHERE user_id=auth.uid() AND is_read=false;
$$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- Enrich queries
CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS TABLE (
  id uuid, job_id uuid, job_title text, status text, amount numeric,
  payment_status text, scheduled_date timestamptz, created_at timestamptz,
  client_id uuid, client_name text, tasker_id uuid, tasker_name text,
  role text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT b.id, b.job_id, j.title, b.status, b.amount, b.payment_status,
         b.scheduled_date, b.created_at,
         b.client_id, pc.full_name, b.tasker_id, pt.full_name,
         CASE WHEN b.client_id=auth.uid() THEN 'client' ELSE 'tasker' END
  FROM public.bookings b
  JOIN public.jobs j ON j.id=b.job_id
  LEFT JOIN public.profiles pc ON pc.id=b.client_id
  LEFT JOIN public.profiles pt ON pt.id=b.tasker_id
  WHERE b.client_id=auth.uid() OR b.tasker_id=auth.uid()
  ORDER BY b.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_booking_detail(_booking_id uuid)
RETURNS TABLE (
  id uuid, job_id uuid, job_title text, job_description text,
  status text, amount numeric, payment_status text, scheduled_date timestamptz,
  client_id uuid, client_name text, tasker_id uuid, tasker_name text,
  my_role text, i_reviewed boolean, other_reviewed boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT b.id, b.job_id, j.title, j.description,
         b.status, b.amount, b.payment_status, b.scheduled_date,
         b.client_id, pc.full_name, b.tasker_id, pt.full_name,
         CASE WHEN b.client_id=auth.uid() THEN 'client' ELSE 'tasker' END,
         EXISTS(SELECT 1 FROM public.reviews r WHERE r.booking_id=b.id AND r.reviewer_id=auth.uid()),
         EXISTS(SELECT 1 FROM public.reviews r WHERE r.booking_id=b.id AND r.reviewer_id<>auth.uid())
  FROM public.bookings b
  JOIN public.jobs j ON j.id=b.job_id
  LEFT JOIN public.profiles pc ON pc.id=b.client_id
  LEFT JOIN public.profiles pt ON pt.id=b.tasker_id
  WHERE b.id=_booking_id AND (b.client_id=auth.uid() OR b.tasker_id=auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_booking_detail(uuid) TO authenticated;

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
