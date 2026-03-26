-- 1. Create custom types
CREATE TYPE user_role AS ENUM ('student', 'other');
CREATE TYPE item_type AS ENUM ('lost', 'found');
CREATE TYPE item_status AS ENUM ('active', 'claimed', 'closed');

-- 2. Create Users Table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    whatsapp_number TEXT,
    role user_role,
    student_class TEXT,     -- specific to student
    roll_number TEXT,       -- specific to student
    occupation TEXT,        -- specific to other
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create Items Table
CREATE TABLE public.items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type item_type NOT NULL,
    category TEXT NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    reward TEXT,
    location_area TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    brand TEXT,
    model TEXT,
    color TEXT,
    unique_id TEXT,
    image_url TEXT,
    ai_verified BOOLEAN DEFAULT false,
    status item_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 4. Create Matches Table (for AI similarity matching)
CREATE TABLE public.matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lost_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    found_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    similarity_score DECIMAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 5. Create Messages Table (In-App Chat)
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Set up Storage for Item Images
-- (Requires executing via Supabase UI or using the storage API)
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Enable RLS for storage
CREATE POLICY "Public items are accessible to everyone." ON storage.objects FOR SELECT USING ( bucket_id = 'item-images' );
CREATE POLICY "Users can insert their own item images." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'item-images' AND auth.uid() = owner );

-- 7. Add RLS Policies for Tables
-- Profiles: Users can read all profiles but only edit their own
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING ( true );
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ( auth.uid() = id );

-- Items: Anyone can view active items, users can edit their own
CREATE POLICY "Items are viewable by everyone." ON public.items FOR SELECT USING ( true );
CREATE POLICY "Users can insert their own items." ON public.items FOR INSERT WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "Users can update own items." ON public.items FOR UPDATE USING ( auth.uid() = user_id );
CREATE POLICY "Users can delete own items." ON public.items FOR DELETE USING ( auth.uid() = user_id );

-- Messages: Users can only read and send messages where they are sender or receiver
CREATE POLICY "Users can read their own messages." ON public.messages FOR SELECT USING ( auth.uid() = sender_id OR auth.uid() = receiver_id );
CREATE POLICY "Users can insert messages." ON public.messages FOR INSERT WITH CHECK ( auth.uid() = sender_id );

-- 8. Add Auto-Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
