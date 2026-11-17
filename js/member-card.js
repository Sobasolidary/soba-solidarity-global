import { supabase, getApprovedMember } from './member-common.js';

const message = document.getElementById('message');
const content = document.getElementById('card-content');
const actions = document.getElementById('card-actions');
const preview = new URLSearchParams(window.location.search).get('preview') === '1';
if (preview) document.body.classList.add('preview');

function setText(id, value) {
  document.getElementById(id).textContent = value == null || value === '' ? '—' : String(value);
}

async function loadCard() {
  try {
    const member = await getApprovedMember();
    if (!member) {
      message.textContent = 'This card is available only to approved and activated SOBA members. Please sign in with your member account.';
      return;
    }
    setText('member-name', member.full_name);
    setText('member-number', member.membership_number);
    setText('class-year', member.class_year);
    message.hidden = true;
    content.hidden = false;
    actions.hidden = false;
  } catch (error) {
    console.error('Membership card error:', error);
    message.textContent = 'Unable to load your membership card. Please refresh or contact the administrator.';
  }
}

document.getElementById('print-card').addEventListener('click', () => window.print());
loadCard();
