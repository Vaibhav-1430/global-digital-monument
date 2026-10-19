import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import { getBusinessInfo } from '../src/config/businessInfo.ts';
import { POST as contactHandler } from '../src/app/api/contact/route.ts';

// -----------------------------------------------------------------------------
// 1. CENTRAL BUSINESS INFO & TRUST CONFIGURATION
// -----------------------------------------------------------------------------
test('Central Business Info — Safe fallbacks and configuration parsing', () => {
  // Test with current environment
  const info = getBusinessInfo();

  // 1. Mandatory structure
  assert.ok(info.contributionLimits, 'Contribution limits must be defined');
  assert.equal(info.contributionLimits.currency, 'INR');
  assert.equal(info.contributionLimits.minimumAmount, 10);
  assert.equal(info.contributionLimits.maximumAmount, 1000000);
  assert.deepEqual(info.contributionLimits.presetAmounts, [10, 25, 35, 55, 100]);

  // 2. Safe defaults when variables are absent or unconfigured
  assert.ok(typeof info.legalEntityName === 'string' && info.legalEntityName.length > 0);
  assert.ok(typeof info.businessAddress === 'string' && info.businessAddress.length > 0);
  assert.ok(typeof info.governingJurisdiction === 'string' && info.governingJurisdiction.length > 0);
  assert.equal(typeof info.refundWindowDays, 'number');
  assert.ok(info.refundWindowDays > 0);

  // 3. Secrets must NEVER be present in public business info
  assert.equal('RAZORPAY_KEY_SECRET' in info, false);
  assert.equal('SUPABASE_SERVICE_ROLE_KEY' in info, false);
  assert.equal('STRIPE_SECRET_KEY' in info, false);
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

  // 1. About page must explicitly state non-profit/charity disclosure
  const aboutContent = fs.readFileSync(path.resolve('src/app/about/page.tsx'), 'utf8');
  assert.ok(
    aboutContent.includes('NOT a registered charity') || aboutContent.includes('independent digital art project'),
    'About page must clarify it is not a registered charity'
  );

  // 2. Contribution policy must match actual presets and state no real land property
  const contribContent = fs.readFileSync(path.resolve('src/app/contribution-policy/page.tsx'), 'utf8');
  assert.ok(contribContent.includes('presetAmounts'), 'Contribution policy must display presets');
  assert.ok(contribContent.includes('No Real Property') || contribContent.includes('Physical Land'), 'Must clarify no physical property');
  assert.ok(contribContent.includes('One-Time'), 'Must clarify single one-time payments (no subscriptions)');

  // 3. Refund policy must detail failed/duplicate charges and have owner review notice
  const refundContent = fs.readFileSync(path.resolve('src/app/refund-policy/page.tsx'), 'utf8');
  assert.ok(refundContent.includes('Checkout Cancellation'), 'Must detail checkout cancellation');
  assert.ok(refundContent.includes('Duplicate Charges'), 'Must detail duplicate charges');
  assert.ok(refundContent.includes('Owner Review Required'), 'Must flag owner review required');

  // 4. Privacy policy must reflect actual data collection and zero card storage
  const privacyContent = fs.readFileSync(path.resolve('src/app/privacy/page.tsx'), 'utf8');
  assert.ok(privacyContent.includes('What We NEVER Collect'), 'Must declare financial zero storage');
  assert.ok(privacyContent.includes('Row Level Security'), 'Must mention database security');
  assert.ok(privacyContent.includes('visited_gdm'), 'Must accurately document session storage');

  // 5. Payment support must have security warnings against sharing PINs/OTPs
  const supportContent = fs.readFileSync(path.resolve('src/app/payment-support/page.tsx'), 'utf8');
  assert.ok(supportContent.includes('NEVER Send These Details'), 'Must contain security warning against sharing PINs');
  assert.ok(supportContent.includes('Razorpay Payment ID'), 'Must instruct user to provide Payment ID');
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
