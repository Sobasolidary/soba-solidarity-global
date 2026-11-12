import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_BASE } from './member-config.js';
if (!SUPABASE_URL.startsWith('https://') || SUPABASE_ANON_KEY.startsWith('PASTE_')) {
  document.body.insertAdjacentHTML('afterbegin','<p class="message error" role="alert">Portal configuration is incomplete. Set the public Supabase URL and key in js/member-config.js.</p>');
  throw new Error('Missing public Supabase configuration');
}
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
export const page = (name) => SITE_BASE + name;
export const $ = (selector) => document.querySelector(selector);
export function notice(message, error=false){const el=$('#message');if(!el)return;el.textContent=message;el.className='message'+(error?' error':'');el.hidden=false;}
export function busy(button, value){button.disabled=value;}
export async function getApprovedMember(){
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return null;
  const {data,error}=await supabase.from('members').select('id,full_name,email,membership_number,class_year,phone,address,city,country,verification_status,payment_status,membership_status,status,activated_at').eq('auth_user_id',user.id).eq('status','active').eq('membership_status','active').eq('verification_status','verified').eq('payment_status','paid').maybeSingle();
  if(error)throw error;
  return data;
}
