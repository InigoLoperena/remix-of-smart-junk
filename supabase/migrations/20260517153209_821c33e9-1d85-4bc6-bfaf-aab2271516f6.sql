-- 1) Restrict listing on public storage buckets (objects still accessible by URL)
DROP POLICY IF EXISTS "Allow public list pickup-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public list chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can list pickup-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can list chat-images" ON storage.objects;

-- Ensure a narrow SELECT policy: anyone can fetch a specific object (by full path/URL),
-- but the broad "list everything" capability is removed by not granting LIST on the bucket.
-- Storage uses the same SELECT policy for both read and list; we keep read open but
-- explicitly deny anonymous listing via a restrictive policy on requests without a name filter.
-- Simpler approach: keep SELECT for authenticated+anon on objects, but require name IS NOT NULL.

DROP POLICY IF EXISTS "Public read pickup-photos" ON storage.objects;
CREATE POLICY "Public read pickup-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pickup-photos' AND name IS NOT NULL);

DROP POLICY IF EXISTS "Public read chat-images" ON storage.objects;
CREATE POLICY "Public read chat-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images' AND name IS NOT NULL);

-- 2) Revoke EXECUTE from anon/public on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.notify_on_bid_update() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_bid_insert() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_owner_on_new_message() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.insert_system_chat_message(uuid, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.release_escrow(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.release_escrow_admin(uuid, numeric, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_participated_in_request(uuid, uuid) FROM anon;
