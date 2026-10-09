// Starting templates for the Privacy Policy and Terms of Use, written for a US vehicle service
// contract (extended car warranty) website. Tokens in {braces} are filled in from the business and
// privacy settings when the page is shown. An attorney must review both documents before relying
// on them (Admin → Legal & privacy has an "approved" checkbox).

export const DEFAULT_PRIVACY_HTML = `
<p>This Privacy Policy explains how {legal_name} (“{company}”, “we”, “us”) collects, uses, shares and protects personal information when you visit {site_url}, request a vehicle service contract quote or talk with our team. It also explains the choices and rights you have, including how to opt out of the sale or sharing of your personal information.</p>

<h2>Information we collect</h2>
<h3>Information you give us</h3>
<ul>
<li><strong>Contact details:</strong> name, email address, phone number and home address.</li>
<li><strong>Vehicle details:</strong> year, make, model, current mileage, ownership, use, annual mileage and whether the factory warranty is still active.</li>
<li><strong>Driver details:</strong> date of birth, gender, marital status, license status, and recent accidents or violations.</li>
<li><strong>Plan preferences:</strong> the kind of protection you are interested in.</li>
<li><strong>Messages:</strong> anything you tell us by phone, email, text or our forms.</li>
</ul>
<h3>Information collected automatically</h3>
<ul>
<li>Your IP address, browser and device type, pages visited, the page that referred you, and advertising campaign details (such as UTM codes and click IDs).</li>
<li>A record of your consent to be contacted, including the exact wording shown, the date and time, your IP address and the page you were on. We may use a third-party service to keep a certificate of this record.</li>
<li>Information from cookies and similar technologies. See <a href="#cookies-analytics-and-advertising">Cookies, analytics and advertising</a>.</li>
</ul>
<h3>Information from others</h3>
<p>Vehicle service contract providers and administrators may send us information about plans you apply for or buy. We may also use data providers to verify or complete contact and vehicle details.</p>

<h2>How we use your information</h2>
<ul>
<li>To prepare your quote and contact you with vehicle service contract plans and prices for your car.</li>
<li>To contact you about your request, prepare your quote and help you buy and manage a plan.</li>
<li>To contact you by phone, text message and email about your request, with your consent.</li>
<li>To run, secure and improve our website, prevent fraud and fix problems.</li>
<li>To measure and improve our advertising.</li>
<li>To meet legal and regulatory obligations.</li>
</ul>

<h2>How we share your information</h2>
<p>We share personal information only as described here:</p>
<ul>
<li><strong>Vehicle service contract providers and administrators</strong> that issue and service the plans we offer, so they can price your plan, issue your contract and handle claims.</li>
<li><strong>Marketing partners</strong> who offer vehicle protection or related products. When we receive payment for this, it may be a “sale” of personal information under some state laws. You can <a href="/do-not-sell">opt out at any time</a>.</li>
<li><strong>Service providers</strong> that work for us, such as hosting, email, phone, payment, analytics and consent-recording companies. They may use your information only to provide services to us.</li>
<li><strong>Legal and safety reasons:</strong> to comply with law, respond to lawful requests, protect our rights, or in connection with a merger or sale of our business.</li>
</ul>

<h2>Calls, texts and emails</h2>
<p>When you submit a quote request and agree to be contacted, we and the companies named in our consent notice may call or text you at the number you provided, including with automated technology or prerecorded messages. Your consent is not a condition of any purchase. Message and data rates may apply.</p>
<p>You can stop texts at any time by replying <strong>STOP</strong>, ask any caller to stop calling you, use the unsubscribe link in our emails, or <a href="/do-not-sell">make a request online</a>. We keep an internal do-not-contact list and honor these requests.</p>

<h2>Cookies, analytics and advertising</h2>
<p>We use cookies and similar tools to keep the website working, understand how it is used (for example, Google Analytics) and measure our advertising (for example, the Meta Pixel). Some advertising tools may be considered “sharing” of personal information for cross-context behavioral advertising under some state laws.</p>
<p>You can block or delete cookies in your browser settings. If you <a href="/do-not-sell">opt out of sale and sharing</a>, or your browser sends a <strong>Global Privacy Control</strong> signal, we turn off advertising tracking for your browser and treat the signal as a request to opt out.</p>

<h2>Your privacy rights</h2>
<p>Depending on where you live (for example California, Colorado, Connecticut, Virginia, Utah, Texas, Oregon and other states with privacy laws), you may have the right to:</p>
<ul>
<li><strong>Know and access</strong> the personal information we hold about you, and get a copy of it.</li>
<li><strong>Delete</strong> personal information we collected from you, with some legal exceptions.</li>
<li><strong>Correct</strong> inaccurate personal information.</li>
<li><strong>Opt out</strong> of the sale or sharing of your personal information, and of targeted advertising.</li>
<li><strong>Limit</strong> the use of sensitive personal information. We do not use sensitive information to infer characteristics about you.</li>
<li><strong>Appeal</strong> a decision we make about your request by replying to our response.</li>
</ul>
<p>We will not discriminate against you for using these rights.</p>
<h3>How to make a request</h3>
<p>Use our <a href="/do-not-sell">privacy request form</a>, email <a href="mailto:{privacy_email}">{privacy_email}</a> or call {privacy_phone}. Opt-out requests take effect right away. For access, deletion and correction requests we will confirm your identity by matching the details you give us with the details we hold, and we will respond within {response_days} days. You may use an authorized agent; we may ask for proof that the agent may act for you.</p>

<h2>Do Not Sell or Share My Personal Information</h2>
<p>To opt out of the sale or sharing of your personal information, use our <a href="/do-not-sell">Do Not Sell or Share My Personal Information</a> page. We also honor Global Privacy Control signals sent by your browser. Once you opt out, we will not sell or share your information with marketing partners, and we turn off advertising tracking for your browser.</p>

<h2>California notice</h2>
<p>In the last 12 months we collected these categories of personal information: identifiers (such as name, email, phone and IP address); personal records (such as address); characteristics of protected classes (such as age, gender and marital status); commercial information (such as your vehicle, its mileage and the plans you asked about); internet activity; and inferences drawn from this information. We collect it from you, your device and the partners described above, for the purposes in <a href="#how-we-use-your-information">How we use your information</a>. We may have sold or shared identifiers, personal records, commercial information and internet activity with marketing partners and advertising networks. We do not knowingly sell or share the personal information of people under 16.</p>

<h2>How long we keep information</h2>
<p>We keep personal information as long as needed for the purposes above, including to keep records of your consent and your contract, and to meet tax and other legal requirements, and then delete or de-identify it.</p>

<h2>How we protect information</h2>
<p>We use administrative, technical and physical safeguards, including encrypted connections, restricted staff access and two-factor sign-in for our systems. No system is perfectly secure, so we cannot guarantee absolute security.</p>

<h2>Children</h2>
<p>Our website is for adults. We do not knowingly collect personal information from anyone under 18.</p>

<h2>Changes to this policy</h2>
<p>We may update this Privacy Policy. The “last updated” date at the top shows when it last changed. Important changes will be highlighted on this page.</p>

<h2>Contact us</h2>
<p>{legal_name}<br>{address}<br>Email: <a href="mailto:{privacy_email}">{privacy_email}</a><br>Phone: {privacy_phone}</p>
`.trim();

export const DEFAULT_TERMS_HTML = `
<p>These Terms of Use apply to your use of {site_url} and any services offered on it by {legal_name} (“{company}”, “we”, “us”). By using this website you agree to these terms. If you do not agree, please do not use the website.</p>

<h2>Our service</h2>
<p>{company} offers vehicle service contracts, often called extended car warranties, for US drivers. Each contract is backed and administered by the provider named in it, which handles claims under the contract's terms. We are not an insurance company and we do not sell insurance. Prices shown on this website are estimates based on the information you provide; your final price, what is included and your eligibility depend on the plan, term, deductible and your vehicle, and are confirmed before you buy.</p>

<h2>Eligibility</h2>
<p>You must be at least 18 years old and live in the United States to use our services. Plans are not available in every state, and some vehicles may not qualify.</p>

<h2>Your information and consent to be contacted</h2>
<p>You agree to give accurate, current and complete information and to use only your own name, phone number and email address. When you submit a quote request and agree to the consent notice shown on the form, you agree to be contacted as described in that notice and in our <a href="/privacy">Privacy Policy</a>. Consent is not a condition of purchase. You can withdraw consent at any time by replying STOP to a text, asking a caller to stop, or using our <a href="/do-not-sell">privacy request form</a>.</p>

<h2>Quotes and estimates</h2>
<p>Estimated prices on this website are for information only and are not an offer. We do not guarantee that your vehicle will qualify for a plan or that an estimate will match your final price. Your contract, once issued, governs what is included, its exclusions and its terms.</p>

<h2>Vehicle service contracts</h2>
<p>Vehicle service contracts are not insurance. What a contract includes, its exclusions, deductibles, waiting periods and cancellation rights are set out in the contract you receive. Please read it carefully. Every plan we sell comes with a 30-day money-back guarantee: if you cancel within 30 days of purchase and no claims have been filed, you get a full refund. After that, cancellation and any prorated refund follow the terms of your contract.</p>

<h2>Acceptable use</h2>
<ul>
<li>Do not submit information about someone else without their permission.</li>
<li>Do not use the website for unlawful, fraudulent or harmful purposes.</li>
<li>Do not try to break, overload, scrape or gain unauthorized access to the website or its systems.</li>
<li>Do not copy, resell or misuse content or data from the website.</li>
</ul>

<h2>Intellectual property</h2>
<p>The website and its content, logos and design belong to {legal_name} or its licensors and are protected by law. You may view and print pages for personal, non-commercial use only.</p>

<h2>Links to other websites</h2>
<p>Our website may link to websites run by others. We are not responsible for their content, terms or privacy practices.</p>

<h2>Disclaimers</h2>
<p>The website and its content are provided “as is” and “as available”, without warranties of any kind, to the fullest extent allowed by law. Information on the website, including repair-cost estimates and articles, is general information and not professional, legal or financial advice.</p>

<h2>Limitation of liability</h2>
<p>To the fullest extent allowed by law, {legal_name} will not be liable for indirect, incidental, special, consequential or punitive damages, or for lost profits or data, arising from your use of the website or services. Our total liability for any claim relating to the website will not exceed one hundred US dollars (US$100).</p>

<h2>Indemnity</h2>
<p>You agree to defend and hold harmless {legal_name} from claims arising from your misuse of the website or your breach of these terms.</p>

<h2>Governing law</h2>
<p>These terms are governed by the laws of the State of {governing_state}, without regard to its conflict-of-law rules, except where the law of your state requires otherwise.</p>

<h2>Changes to these terms</h2>
<p>We may update these terms. The “last updated” date at the top shows when they last changed. Continuing to use the website after a change means you accept the updated terms.</p>

<h2>Contact us</h2>
<p>{legal_name}<br>{address}<br>Email: <a href="mailto:{email}">{email}</a><br>Phone: {phone}</p>
`.trim();
