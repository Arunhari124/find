-- Admin Setup & Chat Delete SQL Script
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR

-- 1. Give users permission to definitively delete their own chats
DROP POLICY IF EXISTS "Users can delete messages" ON public.messages;
CREATE POLICY "Users can delete messages" ON public.messages 
FOR DELETE USING ( auth.uid() = sender_id OR auth.uid() = receiver_id );

-- 2. Create an Admin Bypass Function (God Mode)
-- This function circumvents Row Level Security to fetch all analytics for the Admin panel.
-- It returns a consolidated JSON object containing all users, items, and messages.
CREATE OR REPLACE FUNCTION admin_get_all_data(admin_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: This runs the function with Database Admin privileges bypassing RLS
AS $$
DECLARE
    result json;
    users_data json;
    items_data json;
    messages_data json;
BEGIN
    -- VERY BASIC SECURITY CHECK
    IF admin_passcode != 'find2026' THEN
        RAISE EXCEPTION 'Invalid Admin Passcode';
    END IF;

    SELECT json_agg(row_to_json(p)) INTO users_data FROM public.profiles p;
    SELECT json_agg(row_to_json(i)) INTO items_data FROM public.items i;
    
    -- Combine messages with sender/receiver details for easy reading
    SELECT json_agg(row_to_json(m_detailed)) INTO messages_data
    FROM (
      SELECT m.id, m.content, m.created_at, m.item_id,
             u1.full_name as sender_name, u2.full_name as receiver_name
      FROM public.messages m
      LEFT JOIN public.profiles u1 ON m.sender_id = u1.id
      LEFT JOIN public.profiles u2 ON m.receiver_id = u2.id
      ORDER BY m.created_at DESC
    ) m_detailed;

    result := json_build_object(
        'users', COALESCE(users_data, '[]'::json),
        'items', COALESCE(items_data, '[]'::json),
        'chats', COALESCE(messages_data, '[]'::json)
    );

    RETURN result;
END;
$$;
