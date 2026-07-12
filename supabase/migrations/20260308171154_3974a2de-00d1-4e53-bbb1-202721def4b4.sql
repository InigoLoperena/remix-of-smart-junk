-- Drop the recursive INSERT policy
DROP POLICY IF EXISTS "Admins can add members" ON public.company_members;

-- Allow users to insert themselves as members (for company creation and invitation acceptance)
CREATE POLICY "Users can add themselves as members"
ON public.company_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also fix the SELECT policy to avoid recursion by using a security definer function
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND role = 'admin'
  )
$$;

-- Replace recursive SELECT policy
DROP POLICY IF EXISTS "Members can view their company members" ON public.company_members;
CREATE POLICY "Members can view their company members"
ON public.company_members
FOR SELECT
TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

-- Replace recursive DELETE policy
DROP POLICY IF EXISTS "Admins can remove members" ON public.company_members;
CREATE POLICY "Admins can remove members"
ON public.company_members
FOR DELETE
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id));