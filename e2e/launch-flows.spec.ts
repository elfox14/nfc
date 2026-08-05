import { expect, request as playwrightRequest, test } from '@playwright/test';
import sharp = require('sharp');

const password = 'Launch!2026Password';
const publishedName = 'Published Launch Card';
const privateDraftName = 'Private Autosave Name';
const publishedPhone = '+201000000000';
const privateDraftPhone = '+201111111111';

function publishedState() {
  return {
    inputs: {
      'input-name': publishedName,
      'input-name_ar': publishedName,
      'input-name_en': publishedName,
      'input-tagline': 'Launch verified',
      'qr-source': 'auto-card',
      'qr-size': 30,
      'front-bg-start': '#2a3d54',
      'front-bg-end': '#223246',
      'back-bg-start': '#2a3d54',
      'back-bg-end': '#223246'
    },
    dynamic: {
      phones: [{ id: 'published-phone', value: publishedPhone, placement: 'front' }],
      social: [],
      staticSocial: { email: { value: 'published@example.test', placement: 'back' } }
    },
    imageUrls: {
      capturedFront: '/nfc/mc-prime-nfc.png',
      capturedBack: '/nfc/mc-prime-nfc.png'
    },
    placements: { name: 'front', tagline: 'front', qr: 'back' },
    visibilities: { name: true, tagline: true, phones: true, qr: true, social: true }
  };
}

test.describe.serial('release-critical product journey', () => {
  test('registration, login, OAuth, draft, publish, autosave, viewer, export and deletion', async ({
    baseURL,
    context,
    page,
    request
  }) => {
    if (!baseURL) throw new Error('Playwright baseURL is required');
    const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `launch-${runId}@example.test`;

    await page.addInitScript((apiBase) => {
      (window as typeof window & { __API_BASE_URL?: string }).__API_BASE_URL = apiBase;
    }, baseURL);

    const health = await request.get('/healthz');
    expect(health.status()).toBe(200);
    await expect.poll(async () => (await health.json()).database).toBe('connected');

    // Exercise the real registration and login pages against the running API.
    await page.goto('/nfc/signup.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#name').fill('Launch Test User');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#signup-form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/nfc\/dashboard(?:\.html)?$/, { timeout: 20_000 });

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/nfc/login.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/nfc\/dashboard(?:\.html)?$/, { timeout: 20_000 });

    const accessToken = await page.evaluate(() => sessionStorage.getItem('authAccessToken'));
    expect(accessToken).toBeTruthy();
    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    // OAuth state must be signed, random, HttpOnly, and bound to this browser.
    const oauthStart = await context.request.get('/api/auth/google?lang=en', { maxRedirects: 0 });
    expect(oauthStart.status()).toBe(302);
    const oauthLocation = oauthStart.headers().location;
    expect(oauthLocation).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    const state = new URL(oauthLocation).searchParams.get('state');
    expect(state?.split('.')).toHaveLength(3);
    expect(oauthStart.headers()['set-cookie']).toMatch(/oauthStateNonce=.*HttpOnly.*SameSite=Lax/i);

    const oauthCancel = await context.request.get(
      `/api/auth/google/callback?error=access_denied&state=${encodeURIComponent(state || '')}`,
      { maxRedirects: 0 }
    );
    expect(oauthCancel.status()).toBe(302);
    expect(oauthCancel.headers().location).toContain('/nfc/login-en.html?error=access_denied');

    const attackerContext = await playwrightRequest.newContext({ baseURL });
    const mismatchedCallback = await attackerContext.get(
      `/api/auth/google/callback?error=access_denied&state=${encodeURIComponent(state || '')}`,
      { maxRedirects: 0 }
    );
    expect(mismatchedCallback.status()).toBe(302);
    expect(mismatchedCallback.headers().location).toContain('error=invalid_oauth_state');

    const validPng = await sharp({
      create: { width: 1, height: 1, channels: 4, background: '#ffffff' }
    }).png().toBuffer();
    const anonymousUpload = await attackerContext.post('/api/upload-image-public', {
      multipart: {
        image: {
          name: 'pixel.png',
          mimeType: 'image/png',
          buffer: validPng
        }
      }
    });
    expect(anonymousUpload.status()).toBe(401);
    await attackerContext.dispose();

    const authenticatedUpload = await request.post('/api/upload-image', {
      headers: authHeaders,
      multipart: {
        image: {
          name: 'pixel.png',
          mimeType: 'image/png',
          buffer: validPng
        }
      }
    });
    expect(authenticatedUpload.status()).toBe(200);
    expect(await authenticatedUpload.json()).toMatchObject({ success: true, local: true });

    const createDraft = await request.post('/api/save-design', {
      headers: authHeaders,
      data: {
        inputs: { 'input-name': 'Initial Private Draft', 'qr-source': 'auto-card' },
        dynamic: { phones: [{ id: 'draft-phone', value: privateDraftPhone, placement: 'front' }] }
      }
    });
    expect(createDraft.status()).toBe(200);
    const designId = (await createDraft.json()).id as string;
    expect(designId).toMatch(/^[A-Za-z0-9_-]{4,30}$/);

    expect((await request.get(`/api/get-design/${designId}`)).status()).toBe(404);

    const autosaveDraft = await request.post(`/api/save-design?id=${designId}`, {
      headers: authHeaders,
      data: {
        inputs: { 'input-name': privateDraftName, 'qr-source': 'auto-card' },
        dynamic: { phones: [{ id: 'draft-phone', value: privateDraftPhone, placement: 'front' }] }
      }
    });
    expect(autosaveDraft.status()).toBe(200);
    const ownerDraft = await request.get(`/api/get-design/${designId}/draft`, { headers: authHeaders });
    expect((await ownerDraft.json()).inputs['input-name']).toBe(privateDraftName);
    expect((await request.get(`/api/get-design/${designId}`)).status()).toBe(404);

    const publish = await request.post(`/api/save-design?id=${designId}`, {
      headers: authHeaders,
      data: {
        inputs: { 'input-name': publishedName, 'qr-source': 'auto-card' },
        dynamic: { phones: [{ id: 'published-phone', value: publishedPhone, placement: 'front' }] },
        imageUrls: publishedState().imageUrls,
        publishedState: publishedState(),
        publishedAt: new Date().toISOString()
      }
    });
    expect(publish.status()).toBe(200);

    const postPublishAutosave = await request.post(`/api/save-design?id=${designId}`, {
      headers: authHeaders,
      data: {
        inputs: { 'input-name': privateDraftName, 'qr-source': 'auto-card' },
        dynamic: { phones: [{ id: 'private-phone', value: privateDraftPhone, placement: 'front' }] }
      }
    });
    expect(postPublishAutosave.status()).toBe(200);

    const publicCard = await request.get(`/api/get-design/${designId}`);
    expect(publicCard.status()).toBe(200);
    const publicData = await publicCard.json();
    expect(publicData.inputs['input-name']).toBe(publishedName);
    expect(publicData.dynamic.phones[0].value).toBe(publishedPhone);
    expect(JSON.stringify(publicData)).not.toContain(privateDraftName);
    expect(JSON.stringify(publicData)).not.toContain(privateDraftPhone);
    expect(publicData.publishedState).toBeUndefined();

    await page.goto(`/nfc/viewer.html?id=${designId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#card-name').first()).toContainText(publishedName);
    await expect(page.locator('body')).not.toContainText(privateDraftName);
    await expect(page.locator('.card-front')).toBeAttached();
    await expect(page.locator('.card-back')).toBeAttached();
    await expect(page.locator('.qr-wrapper')).toBeAttached();
    await page.locator('#card').click();
    await expect(page.locator('#card')).toHaveClass(/is-flipped/);

    const vcfDownload = page.waitForEvent('download');
    await page.locator('#ejs-save-btn').click();
    const download = await vcfDownload;
    expect(download.suggestedFilename()).toMatch(/\.vcf$/i);

    const exported = await request.get('/api/auth/export-data', { headers: authHeaders });
    expect(exported.status()).toBe(200);
    expect(exported.headers()['content-disposition']).toContain('attachment');
    const exportedData = await exported.json();
    expect(exportedData.account.email).toBe(email);
    expect(exportedData.designs).toHaveLength(1);
    expect(JSON.stringify(exportedData)).not.toContain('password');
    expect(JSON.stringify(exportedData)).not.toContain('refreshTokenHash');

    const unconfirmedDelete = await request.delete('/api/auth/account', {
      headers: authHeaders,
      data: { confirmation: 'delete' }
    });
    expect(unconfirmedDelete.status()).toBe(400);

    const deleteAccount = await request.delete('/api/auth/account', {
      headers: authHeaders,
      data: { confirmation: 'DELETE' }
    });
    expect(deleteAccount.status()).toBe(200);
    expect((await request.get(`/api/get-design/${designId}`)).status()).toBe(404);
    expect((await request.post('/api/auth/login', { data: { email, password } })).status()).toBe(400);
  });
});
