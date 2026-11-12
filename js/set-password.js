import {supabase,page,notice,busy,getApprovedMember,$} from './member-common.js';
let verified=false;
async function init(){try{
  const url=new URL(location.href);const code=url.searchParams.get('code');const tokenHash=url.searchParams.get('token_hash');const type=url.searchParams.get('type');
  if(code){const {error}=await supabase.auth.exchangeCodeForSession(code);if(error)throw error;}
  else if(tokenHash && (type==='invite'||type==='recovery')){const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type});if(error)throw error;}
  else if(location.hash.includes('access_token=')){const hash=new URLSearchParams(location.hash.slice(1));const {error}=await supabase.auth.setSession({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token')});if(error)throw error;}
  else{notice('Use the secure link from your SOBA invitation or password-reset email.',true);return;}
  history.replaceState({},'',location.pathname);
  const member=await getApprovedMember();if(!member){await supabase.auth.signOut();notice('Your account is not linked to an approved SOBA membership. Contact the administrator.',true);return;}
  verified=true;$('#password-form').classList.remove('hidden');notice('Link verified. You can now create a password.');
}catch(err){notice('This link is invalid or expired. Request a new invitation or password reset.',true);console.error(err);}}
$('#password-form').addEventListener('submit',async(e)=>{e.preventDefault();if(!verified)return;const pass=$('#password').value;if(pass!==$('#confirm').value){notice('Passwords do not match.',true);return;}if(pass.length<12){notice('Use at least 12 characters.',true);return;}const btn=$('#save-button');busy(btn,true);try{const {error}=await supabase.auth.updateUser({password:pass});if(error)throw error;notice('Password saved. Opening your dashboard…');location.replace(page('member-dashboard.html'));}catch(err){notice(err.message||'Unable to save password.',true);}finally{busy(btn,false);}});
init();
