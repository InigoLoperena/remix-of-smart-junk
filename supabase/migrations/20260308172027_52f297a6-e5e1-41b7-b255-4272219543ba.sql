-- Fix companies INSERT policy - the current one should work, let's check by recreating it
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Fix companies SELECT policy to use security definer function
DROP POLICY IF EXISTS "Members can view their company" ON public.companies;
CREATE POLICY "Members can view their company"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_company_member(auth.uid(), id));

-- Also allow company creators to see their company immediately after creation
-- The issue is the SELECT policy uses company_members, but the member isn't added yet
-- Fix: allow the creator to also see the company
DROP POLICY IF EXISTS "Creator can view their company" ON public.companies;
CREATE POLICY "Creator can view their company"
ON public.companies
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update company" ON public.companies;
CREATE POLICY "Admins can update company"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.is_company_admin(auth.uid(), id));