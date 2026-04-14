const SUPABASE_URL = 'https://pryogyuclybetietopjm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeW9neXVjbHliZXRpZXRvcGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODMyNDQsImV4cCI6MjA5MTY1OTI0NH0.t6duDOgfIKzKlBnz1W4u6OZ8NFRygjYZwIShKuBVX1M';

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);