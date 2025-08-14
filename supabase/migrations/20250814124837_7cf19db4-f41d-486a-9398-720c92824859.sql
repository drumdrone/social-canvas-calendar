-- Fix security issue: Allow customers to access their own orders
-- Add user_id column to link WooCommerce orders to Supabase auth users
ALTER TABLE public.woocommerce_orders 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance on user_id lookups
CREATE INDEX idx_woocommerce_orders_user_id ON public.woocommerce_orders(user_id);

-- Update RLS policies to allow customers to see their own orders
CREATE POLICY "Users can view their own orders" 
ON public.woocommerce_orders 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own orders (for order status tracking, etc.)
CREATE POLICY "Users can update their own orders" 
ON public.woocommerce_orders 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a function to safely link WooCommerce customers to Supabase users
-- This allows admins to associate orders with users via email matching
CREATE OR REPLACE FUNCTION public.link_order_to_user(
  order_id bigint,
  user_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  -- If user found, link the order
  IF target_user_id IS NOT NULL THEN
    UPDATE public.woocommerce_orders 
    SET user_id = target_user_id 
    WHERE id = order_id 
    AND billing_email = user_email; -- Extra security check
    
    RETURN FOUND;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users (admins can use this function)
GRANT EXECUTE ON FUNCTION public.link_order_to_user(bigint, text) TO authenticated;