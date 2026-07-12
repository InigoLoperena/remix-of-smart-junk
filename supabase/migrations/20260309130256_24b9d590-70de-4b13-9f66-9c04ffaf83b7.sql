-- Drop location_reports table
DROP TABLE IF EXISTS public.location_reports CASCADE;

-- Drop company_invitations table
DROP TABLE IF EXISTS public.company_invitations CASCADE;

-- Drop company_members table
DROP TABLE IF EXISTS public.company_members CASCADE;

-- Drop companies table
DROP TABLE IF EXISTS public.companies CASCADE;

-- Drop company helper functions
DROP FUNCTION IF EXISTS public.is_company_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_company_admin(uuid, uuid);

-- Drop member_role and report_status enums
DROP TYPE IF EXISTS public.member_role CASCADE;
DROP TYPE IF EXISTS public.report_status CASCADE;