SOBA Digital Membership Card - Step 68

UPLOAD these files into the EXISTING GitHub Pages repository (do not overwrite other files):
- member-card.html                 -> repository root
- js/member-card.js                -> js/
- css/member-card.css              -> css/
- assets/sasse-crest.png           -> assets/
- assets/sasse-campus.jpg          -> assets/

The JS imports the EXISTING js/member-common.js and uses getApprovedMember().
It shows the card only after that function returns an approved member.

Dashboard integration:
In member-dashboard.html, add this after your current dashboard cards, inside the main content:
<section aria-label="Digital membership card" style="margin-top:28px">
  <h2>My digital membership card</h2>
  <iframe title="My SOBA membership card" src="member-card.html?preview=1" style="width:100%;max-width:440px;height:590px;border:0" loading="lazy"></iframe>
  <p><a href="member-card.html">Open, print or save my membership card</a></p>
</section>

IMPORTANT: This uses the school crest extracted from the user-supplied picture, not a verified separate SOBA logo. Replace assets/sasse-crest.png if an official SOBA logo is provided later.

The card is for member display and printing. A public QR verification endpoint has NOT been implemented.
