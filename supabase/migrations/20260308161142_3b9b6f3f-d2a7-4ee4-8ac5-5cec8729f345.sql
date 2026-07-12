
-- Create member role enum
CREATE TYPE public.member_role AS ENUM ('admin', 'member');

-- Create report status enum
CREATE TYPE public.report_status AS ENUM ('pending', 'in_route', 'collected');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their company" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Company members table
CREATE TABLE public.company_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Location reports table
CREATE TABLE public.location_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.location_reports ENABLE ROW LEVEL SECURITY;

-- Company invitations table
CREATE TABLE public.company_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- RLS for companies: members can see their company
CREATE POLICY "Members can view their company" ON public.companies FOR SELECT TO authenticated
  USING (id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated users can create companies" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update company" ON public.companies FOR UPDATE TO authenticated
  USING (id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS for company_members
CREATE POLICY "Members can view their company members" ON public.company_members FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()));
CREATE POLICY "Admins can add members" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members cm WHERE cm.user_id = auth.uid() AND cm.role = 'admin'));
CREATE POLICY "Admins can remove members" ON public.company_members FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members cm WHERE cm.user_id = auth.uid() AND cm.role = 'admin'));

-- RLS for location_reports
CREATE POLICY "Members can view company reports" ON public.location_reports FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can create reports" ON public.location_reports FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()) AND auth.uid() = reported_by);
CREATE POLICY "Members can update report status" ON public.location_reports FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- RLS for invitations
CREATE POLICY "Admins can view invitations" ON public.company_invitations FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND role = 'admin') OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Admins can create invitations" ON public.company_invitations FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update their invitation" ON public.company_invitations FOR UPDATE TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Check if there are pending invitations for this email
  -- If so, add them to the company
  INSERT INTO public.company_members (company_id, user_id, role)
  SELECT ci.company_id, NEW.id, 'member'
  FROM public.company_invitations ci
  WHERE ci.email = NEW.email AND ci.accepted = false;
  
  UPDATE public.company_invitations SET accepted = true WHERE email = NEW.email AND accepted = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
