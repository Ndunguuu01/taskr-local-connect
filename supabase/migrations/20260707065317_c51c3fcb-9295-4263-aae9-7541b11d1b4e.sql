
REVOKE EXECUTE ON FUNCTION public.create_booking(uuid,uuid,numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_booking_status(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_message(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_review(uuid,int,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_bookings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_booking_detail(uuid) FROM PUBLIC, anon;
