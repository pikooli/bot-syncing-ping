import 'dotenv/config';
import { cleanDB } from '@/lib/supabase';

const cleanDBScript = async () => {
  await cleanDB();
};

cleanDBScript();
