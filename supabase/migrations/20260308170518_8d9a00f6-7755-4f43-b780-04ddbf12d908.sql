-- Add location to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;

-- Add location to pickup_requests
ALTER TABLE public.pickup_requests ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.pickup_requests ADD COLUMN IF NOT EXISTS longitude double precision;

-- Function to calculate distance between two points (Haversine)
CREATE OR REPLACE FUNCTION public.distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371 * acos(
    LEAST(1.0, cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) + sin(radians(lat1)) * sin(radians(lat2)))
  )
$$;