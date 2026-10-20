import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  getBusinessInfo,
  checkCommercialLaunchReadiness,
  assertCommercialLaunchReadiness,
  isValidConfiguredValue,
  isCommercialLaunchRequested,
} from '../src/config/businessInfo.ts';
import { POST as contactHandler } from '../src/app/api/contact/route.ts';

// -----------------------------------------------------------------------------
// 1. CENTRAL BUSINESS INFO & OWNER-CONFIRMED OPERATOR IDENTITY
// -----------------------------------------------------------------------------
test('Central Business Info — Owner-confirmed operator identity and unconfirmed field tracking', () => {
  // Test with current environment
  const info = getBusinessInfo();

  // 1. Mandatory structure
  assert.ok(info.contributionLimits, 'Contribution limits must be defined');
  assert.equal(info.contributionLimits.currency, 'INR');
  assert.equal(info.contributionLimits.minimumAmount, 10);
  assert.equal(info.contributionLimits.maximumAmount, 1000000);
  assert.deepEqual(info.contributionLimits.presetAmounts, [10, 25, 35, 55, 100]);

  // 2. Owner-confirmed operator identity: Individual project named "Immortal"
  assert.equal(info.operatorType, 'individual', 'Operator type must be individual project');
  assert.equal(info.operatorName, 'Immortal', 'Operator name must be owner-confirmed project name Immortal');
  assert.equal(info.isRegisteredEntity, false, 'Must not claim to be a registered company without verified evidence');
  assert.equal(info.supportEmail, 'printkaro.org@gmail.com', 'Support email must match owner-provided address');

  // 3. Unconfirmed fields must be clearly identified and never silently replaced with fake corporate details
  if (!process.env.NEXT_PUBLIC_BUSINESS_ADDRESS) {
    assert.equal(info.isAddressConfigured, false);
    assert.ok(info.businessAddress.includes('Unconfirmed'), 'Address must be explicitly marked unconfirmed');
  }
  if (!process.env.NEXT_PUBLIC_GOVERNING_JURISDICTION) {
    assert.equal(info.isJurisdictionConfigured, false);
    assert.ok(info.governingJurisdiction.includes('Unconfirmed'), 'Jurisdiction must be explicitly marked unconfirmed');
  }

  // 4. Secrets must NEVER be present in public business info
  assert.equal('RAZORPAY_KEY_SECRET' in info, false);
  assert.equal('SUPABASE_SERVICE_ROLE_KEY' in info, false);
  assert.equal('STRIPE_SECRET_KEY' in info, false);
});

// -----------------------------------------------------------------------------
// 2. COMMERCIAL LAUNCH READINESS GUARD & PLACEHOLDER DETECTION
// -----------------------------------------------------------------------------
test('Launch Readiness — Blocks commercial live launch when identity fields are unconfirmed', () => {
  // In current environment, address and jurisdiction are unconfirmed
  const readiness = checkCommercialLaunchReadiness();
  assert.equal(readiness.isReady, false, 'Commercial checkout must be blocked when identity fields are unconfirmed');
  assert.ok(readiness.missingRequirements.length > 0);
  assert.ok(
    readiness.missingRequirements.some((r) => r.includes('address')),
    'Must detect missing business address'
  );
  assert.ok(
    readiness.missingRequirements.some((r) => r.includes('jurisdiction')),
    'Must detect missing governing jurisdiction'
  );

  // Assertion throws with descriptive missing requirement details
  assert.throws(
    () => {
      assertCommercialLaunchReadiness();
    },
    (err) => {
      assert.match(err.message, /Commercial live launch blocked/);
      assert.match(err.message, /NEXT_PUBLIC_BUSINESS_ADDRESS/);
      return true;
    }
  );
});

test('Launch Readiness — Guard cannot be bypassed by unexpected or placeholder environment variables', () => {
  // 1. Placeholder strings are strictly rejected
  assert.equal(isValidConfiguredValue(undefined), false);
  assert.equal(isValidConfiguredValue(null), false);
  assert.equal(isValidConfiguredValue(''), false);
  assert.equal(isValidConfiguredValue('   '), false);
  assert.equal(isValidConfiguredValue('undefined'), false);
  assert.equal(isValidConfiguredValue('null'), false);
  assert.equal(isValidConfiguredValue('none'), false);
  assert.equal(isValidConfiguredValue('placeholder'), false);
  assert.equal(isValidConfiguredValue('n/a'), false);
  assert.equal(isValidConfiguredValue('Registered address pending owner confirmation'), false);
  assert.equal(isValidConfiguredValue('Jurisdiction pending owner confirmation'), false);
  assert.equal(isValidConfiguredValue('Unconfirmed address'), false);

  // 2. Genuine configured values pass
  assert.equal(isValidConfiguredValue('100 Marine Drive, Mumbai 400020, India'), true);
  assert.equal(isValidConfiguredValue('High Court of Bombay, Mumbai, Maharashtra, India'), true);

  // 3. Commercial launch request parsing handles truthy variations safely
  const originalLaunch = process.env.COMMERCIAL_LAUNCH;
  try {
    process.env.COMMERCIAL_LAUNCH = 'true';
    assert.equal(isCommercialLaunchRequested(), true);
    process.env.COMMERCIAL_LAUNCH = '1';
    assert.equal(isCommercialLaunchRequested(), true);
    process.env.COMMERCIAL_LAUNCH = 'yes';
    assert.equal(isCommercialLaunchRequested(), true);
    process.env.COMMERCIAL_LAUNCH = 'on';
    assert.equal(isCommercialLaunchRequested(), true);

    process.env.COMMERCIAL_LAUNCH = 'false';
    assert.equal(isCommercialLaunchRequested(), false);
    process.env.COMMERCIAL_LAUNCH = '0';
    assert.equal(isCommercialLaunchRequested(), false);
    delete process.env.COMMERCIAL_LAUNCH;
    assert.equal(isCommercialLaunchRequested(), false);
  } finally {
    process.env.COMMERCIAL_LAUNCH = originalLaunch;
  }
});

// -----------------------------------------------------------------------------
// 2. SECURE CONTACT FORM API: VALIDATION, RATE LIMITING & ANTI-SPAM
// -----------------------------------------------------------------------------
test('Contact API — Validates inputs, rejects spam honeypots, and generates reference IDs', async () => {
  // Helper to create mock NextRequest
  const createMockRequest = (body, ip = '192.168.1.100') => {
    return {
      headers: new Map([['x-forwarded-for', ip]]),
      json: async () => body,
    };
  };

  // Test 1: Valid submission passes
  const validReq = createMockRequest({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    category: 'general',
    message: 'Hello, I have a question regarding lighting coordinates on the 3D globe.',
  }, '10.0.0.1');

  const validRes = await contactHandler(validReq);
  const validData = await validRes.json();
  assert.equal(validRes.status, 200);
  assert.equal(validData.success, true);
  assert.ok(validData.referenceId.startsWith('INQ-'));

  // Test 2: Invalid email rejected
  const invalidEmailReq = createMockRequest({
    name: 'Ada Lovelace',
    email: 'not-an-email',
    category: 'general',
    message: 'Valid message content exceeding minimum length.',
  }, '10.0.0.2');

  const invalidEmailRes = await contactHandler(invalidEmailReq);
  assert.equal(invalidEmailRes.status, 400);

  // Test 3: Short message rejected (< 10 chars)
  const shortMsgReq = createMockRequest({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    category: 'general',
    message: 'Too short',
  }, '10.0.0.3');

  const shortMsgRes = await contactHandler(shortMsgReq);
  assert.equal(shortMsgRes.status, 400);

  // Test 4: Honeypot bot detection (hp filled) returns silent honeypot response
  const botReq = createMockRequest({
    name: 'Spam Bot',
    email: 'spammer@botnet.ru',
    category: 'general',
    message: 'Buy cheap SEO services now at http://spam.example.com',
    hp: 'http://spam-link.example.com',
  }, '10.0.0.4');

  const botRes = await contactHandler(botReq);
  const botData = await botRes.json();
  assert.equal(botRes.status, 200);
  assert.ok(botData.referenceId.includes('SPAM'));
});

// -----------------------------------------------------------------------------
// 3. FILE INTEGRITY & ROUTE DISCLOSURE AUDIT
// -----------------------------------------------------------------------------
test('Trust & Legal Pages — Route existence and content disclosure verification', () => {
  const routes = [
    'src/app/about/page.tsx',
    'src/app/contact/page.tsx',
    'src/app/contribution-policy/page.tsx',
    'src/app/refund-policy/page.tsx',
    'src/app/terms/page.tsx',
    'src/app/privacy/page.tsx',
    'src/app/payment-support/page.tsx',
  ];

  for (const route of routes) {
    const fullPath = path.resolve(route);
    assert.ok(fs.existsSync(fullPath), `Route file must exist: ${route}`);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Every page must have metadata and export default component
    assert.ok(content.includes('export const metadata'), `Route ${route} must export metadata`);
    assert.ok(content.includes('export default function'), `Route ${route} must export default page`);
    assert.ok(content.includes('LegalPageLayout'), `Route ${route} must use LegalPageLayout`);
  }

  // 1. About page must explicitly state non-profit/charity disclosure and individual operator
  const aboutContent = fs.readFileSync(path.resolve('src/app/about/page.tsx'), 'utf8');
  assert.ok(
    aboutContent.includes('registered charity') && aboutContent.includes('individual-operated digital art project'),
    'About page must clarify it is an individual-operated project and not a registered charity'
  );
  assert.ok(aboutContent.includes('Immortal'), 'About page must name project Immortal');

  // 2. Terms of service must reflect individual project and unconfirmed jurisdiction
  const termsContent = fs.readFileSync(path.resolve('src/app/terms/page.tsx'), 'utf8');
  assert.ok(termsContent.includes('individual digital art project'), 'Terms must state individual digital art project');
  assert.ok(
    termsContent.includes('businessInfo.operatorName') || termsContent.includes('Immortal'),
    'Terms must reference operatorName or Immortal'
  );
  assert.ok(
    !termsContent.includes('Pvt. Ltd.') && !termsContent.includes('LLP'),
    'Terms must never represent Immortal as an unverified registered entity'
  );

  // 3. Contact page must NOT promise invented 9-to-5 hours or weekend monitoring
  const contactContent = fs.readFileSync(path.resolve('src/app/contact/page.tsx'), 'utf8');
  assert.ok(!contactContent.includes('10:00 AM – 6:00 PM IST'), 'Contact page must not invent 9-to-5 enterprise operating hours');
  assert.ok(!contactContent.includes('Weekend: Critical payment verification tickets monitored'), 'Contact page must not invent weekend monitoring claims');
  assert.ok(contactContent.includes('best-effort'), 'Contact page must state best-effort inquiry review');
  assert.ok(contactContent.includes('Individual Project'), 'Contact page must specify individual project');

  // 4. Contribution policy must match actual presets and state no real land property
  const contribContent = fs.readFileSync(path.resolve('src/app/contribution-policy/page.tsx'), 'utf8');
  assert.ok(contribContent.includes('presetAmounts'), 'Contribution policy must display presets');
  assert.ok(contribContent.includes('No Real Property') || contribContent.includes('Physical Land'), 'Must clarify no physical property');
  assert.ok(contribContent.includes('One-Time'), 'Must clarify single one-time payments (no subscriptions)');

  // 5. Refund policy must detail failed/duplicate charges and have owner review notice
  const refundContent = fs.readFileSync(path.resolve('src/app/refund-policy/page.tsx'), 'utf8');
  assert.ok(refundContent.includes('Checkout Cancellation'), 'Must detail checkout cancellation');
  assert.ok(refundContent.includes('Duplicate Charges'), 'Must detail duplicate charges');
  assert.ok(refundContent.includes('Owner Review Required'), 'Must flag owner review required');

  // 6. Privacy policy must reflect actual data collection and zero card storage
  const privacyContent = fs.readFileSync(path.resolve('src/app/privacy/page.tsx'), 'utf8');
  assert.ok(privacyContent.includes('What We NEVER Collect'), 'Must declare financial zero storage');
  assert.ok(privacyContent.includes('Row Level Security'), 'Must mention database security');
  assert.ok(privacyContent.includes('visited_gdm'), 'Must accurately document session storage');

  // 7. Payment support must have security warnings against sharing PINs/OTPs
  const supportContent = fs.readFileSync(path.resolve('src/app/payment-support/page.tsx'), 'utf8');
  assert.ok(supportContent.includes('NEVER Send These Details'), 'Must contain security warning against sharing PINs');
  assert.ok(supportContent.includes('Razorpay Payment ID'), 'Must instruct user to provide Payment ID');
  assert.ok(!supportContent.includes('within 24 to 48 business hours'), 'Must not claim guaranteed 24-48h SLA without owner confirmation');
});

// -----------------------------------------------------------------------------
// 4. NAVIGATION INTEGRATION & FOOTER AUDIT
// -----------------------------------------------------------------------------
test('Navigation Integration — SiteFooter and modal links contain all trust routes', () => {
  const footerContent = fs.readFileSync(path.resolve('src/components/SiteFooter.tsx'), 'utf8');
  const requiredLinks = [
    '/about',
    '/contribution-policy',
    '/refund-policy',
    '/terms',
    '/privacy',
    '/payment-support',
    '/contact',
  ];

  for (const link of requiredLinks) {
    assert.ok(footerContent.includes(`href="${link}"`), `SiteFooter must include link to ${link}`);
  }

  // Check AddYourLightFlow includes policy and payment support
  const flowContent = fs.readFileSync(path.resolve('src/components/AddYourLightFlow.tsx'), 'utf8');
  assert.ok(flowContent.includes('/contribution-policy'), 'AddYourLightFlow must link to /contribution-policy');
  assert.ok(flowContent.includes('/payment-support'), 'AddYourLightFlow must link to /payment-support');

  // Check AboutOverlay includes trust links
  const aboutOverlayContent = fs.readFileSync(path.resolve('src/components/AboutOverlay.tsx'), 'utf8');
  assert.ok(aboutOverlayContent.includes('/about'), 'AboutOverlay must link to /about');
  assert.ok(aboutOverlayContent.includes('/contribution-policy'), 'AboutOverlay must link to /contribution-policy');
  assert.ok(aboutOverlayContent.includes('/contact'), 'AboutOverlay must link to /contact');
});
