-- Fix security issue: Replace overly permissive service role policy with restricted access
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role full access to orders" ON public.woocommerce_orders;

-- Create more restrictive service role policies for specific operations only
-- Allow service role to INSERT new orders (for WooCommerce sync)
CREATE POLICY "Service role can insert orders" 
ON public.woocommerce_orders 
FOR INSERT 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Allow service role to UPDATE orders (for status/fulfillment updates)
CREATE POLICY "Service role can update orders" 
ON public.woocommerce_orders 
FOR UPDATE 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Allow service role to SELECT orders (for reading/syncing)
CREATE POLICY "Service role can select orders" 
ON public.woocommerce_orders 
FOR SELECT 
USING (auth.role() = 'service_role'::text);

-- Note: Deliberately NOT allowing DELETE for service role as a security measure
-- If deletion is needed, it should be done through admin interface or specific function