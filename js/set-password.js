
import {
  supabase,
  page,
  notice,
  busy,
  getApprovedMember,
  $
} from './member-common.js';

let verified = false;

const form = $('#password-form');

async function init() {
  try {
    form.classList.add('hidden');

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');

    // Allow Supabase to finish restoring any existing session.
    await supabase.auth.initialize();

    if (code) {
      const { error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error) throw error;

    } else if (
      tokenHash &&
      (type === 'invite' || type === 'recovery')
    ) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type
      });

      if (error) throw error;

    } else if (window.location.hash.includes('access_token=')) {
      const hash = new URLSearchParams(
        window.location.hash.substring(1)
      );

      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');

      if (!accessToken || !refreshToken) {
        throw new Error('Incomplete recovery link');
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) throw error;
    }

    // Check whether a valid session exists.
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      notice(
        'Auth session missing. Please open the latest password-reset email link.',
        true
      );
      return;
    }

    // Verify the session belongs to an approved member.
    const member = await getApprovedMember();

    if (!member) {
      notice(
        'Your account is not linked to an approved SOBA membership. Contact the administrator.',
        true
      );
      return;
    }

    verified = true;

    // Remove recovery tokens from the browser address bar.
    history.replaceState(
      {},
      '',
      window.location.pathname
    );

    form.classList.remove('hidden');

    notice(
      'Account verified. You can now create your password.'
    );

  } catch (error) {
    console.error('Password setup error:', error);

    notice(
      'The password-reset link is invalid or expired. Please request a new link.',
      true
    );
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!verified) return;

  const password = $('#password').value;
  const confirmation = $('#confirm').value;

  if (password.length < 12) {
    notice('Use at least 12 characters.', true);
    return;
  }

  if (password !== confirmation) {
    notice('Passwords do not match.', true);
    return;
  }

  const button = $('#save-button');
  busy(button, true);

  try {
    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) throw error;

    notice('Password saved successfully.');

    window.location.replace(
      page('member-dashboard.html')
    );

  } catch (error) {
    console.error('Password update failed:', error);

    notice(
      error.message || 'Unable to save password.',
      true
    );

  } finally {
    busy(button, false);
  }
});

init();
