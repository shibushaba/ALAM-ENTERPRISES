-- 1. Create the main data ledger table
CREATE TABLE app_data (
  id text PRIMARY KEY,
  data jsonb
);

-- 2. Turn on Row Level Security (RLS)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- 3. Add open policies (since this app currently does not enforce user sessions)
CREATE POLICY "Enable read access for all users" ON app_data FOR SELECT USING (true);
CREATE POLICY "Enable insert for anonymously" ON app_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for anonymously" ON app_data FOR UPDATE USING (true);

-- 4. Create the PDFs bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', true);

-- 5. Add open policies for the PDFs bucket
CREATE POLICY "Enable upload for everyone" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'pdfs' );
CREATE POLICY "Enable select for everyone" ON storage.objects FOR SELECT USING ( bucket_id = 'pdfs' );
CREATE POLICY "Enable delete for everyone" ON storage.objects FOR DELETE USING ( bucket_id = 'pdfs' );
CREATE POLICY "Enable update for everyone" ON storage.objects FOR UPDATE USING ( bucket_id = 'pdfs' );
