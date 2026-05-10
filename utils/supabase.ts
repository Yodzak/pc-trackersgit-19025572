import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oiexcrqfnwowzpcqeslh.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y_i9lzeS7Pq-kHUiXq7knQ_juvWC4Wm';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
