
DROP POLICY IF EXISTS "profiles viewable by everyone" ON public.profiles;

CREATE POLICY "profiles selectable by owner or admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.profiles FROM anon;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'admin_cancel_booking','admin_delete_job','admin_grant_role',
        'admin_list_users','admin_revoke_role','admin_set_suspended',
        'admin_stats','create_booking','create_job','create_review',
        'get_booking_detail','get_my_bookings','mark_all_notifications_read',
        'mark_messages_read','mark_notification_read','send_message',
        'update_booking_status','upsert_tasker_profile'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN ('get_job_public','get_tasker_public','nearby_taskers','has_role')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
  END LOOP;
END$$;
