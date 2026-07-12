-- Members can delete their own reports
CREATE POLICY "Members can delete own reports"
ON public.location_reports FOR DELETE
USING (auth.uid() = reported_by);

-- Admins can delete any report in their company
CREATE POLICY "Admins can delete company reports"
ON public.location_reports FOR DELETE
USING (is_company_admin(auth.uid(), company_id));