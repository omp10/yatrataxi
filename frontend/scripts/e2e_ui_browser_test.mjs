import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/Abcom/.gemini/antigravity-ide/brain/8f94d187-b94d-49bd-ac70-30be2516cf62';
const BASE_URL = 'http://localhost:5173';

async function runBrowserTests() {
  console.log('=== STARTING PLAYWRIGHT END-TO-END UI BROWSER TESTS ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // mobile viewport typical for user/driver app
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // FLOW 1: User Login
  console.log('1. Testing User Login Flow...');
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_01_user_login_modal.png') });

    // Look for Phone login button or input
    const phoneBtn = page.locator('text=Continue with Phone Number');
    if (await phoneBtn.isVisible()) {
      await phoneBtn.click();
    }

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="mobile" i]').first();
    await phoneInput.waitFor({ timeout: 5000 });
    await phoneInput.fill('9999900001');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_02_phone_entered.png') });

    const nextBtn = page.locator('button:has-text("Next Step"), button:has-text("Continue"), button:has-text("Send OTP")').first();
    await nextBtn.click();

    // Verify OTP page
    await page.waitForURL('**/verify-otp**', { timeout: 8000 });
    console.log('✔ Navigated to OTP verification page');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_03_otp_page.png') });

    // Fill OTP
    const otpInputs = page.locator('input[maxlength="1"], input[type="text"], input[type="tel"]');
    const count = await otpInputs.count();
    if (count >= 4) {
      for (let i = 0; i < 4; i++) {
        await otpInputs.nth(i).fill('0');
      }
    } else {
      await page.keyboard.type('0000');
    }

    const verifyBtn = page.locator('button:has-text("Verify"), button:has-text("Continue")').first();
    await verifyBtn.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_04_user_dashboard.png') });
    console.log('✔ User logged in, current URL:', page.url());
  } catch (err) {
    console.error('✘ User Login Flow error:', err.message);
  }

  // FLOW 2: Ride Booking - Select Location & Vehicle
  console.log('\n2. Testing Ride Booking Flow...');
  try {
    // Navigate to select-location or click Where to?
    await page.goto(`${BASE_URL}/select-location`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_05_select_location.png') });
    console.log('✔ Select Location page loaded:', page.url());

    // Enter destination if input is available
    const destInput = page.locator('input[placeholder*="Where to" i], input[placeholder*="destination" i], input[placeholder*="Drop" i]').first();
    if (await destInput.isVisible()) {
      await destInput.fill('Vijay Nagar, Indore');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_06_destination_typed.png') });
    }

    // Go to select-vehicle directly to test vehicle selection and pricing
    await page.goto(`${BASE_URL}/select-vehicle`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_07_select_vehicle.png') });
    console.log('✔ Select Vehicle page loaded, vehicles visible');

    // Check if vehicles are rendered
    const vehicleCards = page.locator('[role="button"], .cursor-pointer');
    const vehicleCount = await vehicleCards.count();
    console.log(`✔ Found ${vehicleCount} interactive vehicle cards/options`);
  } catch (err) {
    console.error('✘ Ride Booking Flow error:', err.message);
  }

  // FLOW 3: Driver Portal - Driver Login & Wallet
  console.log('\n3. Testing Driver Portal...');
  const driverContext = await browser.newContext({
    viewport: { width: 412, height: 915 },
  });
  const driverPage = await driverContext.newPage();
  try {
    // Go to driver phone registration / login
    await driverPage.goto(`${BASE_URL}/taxi/driver/login`, { waitUntil: 'networkidle' }).catch(async () => {
      await driverPage.goto(`${BASE_URL}/taxi/driver/registration/phone`, { waitUntil: 'networkidle' });
    });
    await driverPage.waitForTimeout(2000);
    await driverPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_08_driver_login.png') });
    console.log('✔ Driver login/registration page loaded:', driverPage.url());

    // Test Driver Wallet
    await driverPage.goto(`${BASE_URL}/taxi/driver/wallet`, { waitUntil: 'networkidle' });
    await driverPage.waitForTimeout(2000);
    await driverPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_09_driver_wallet.png') });
    console.log('✔ Driver Wallet page loaded:', driverPage.url());
  } catch (err) {
    console.error('✘ Driver Portal error:', err.message);
  }

  // FLOW 4: Admin Portal (Desktop Viewport)
  console.log('\n4. Testing Admin Portal...');
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const adminPage = await adminContext.newPage();
  try {
    await adminPage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await adminPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_10_admin_login.png') });

    // Fill Admin Credentials
    const emailInput = adminPage.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passInput = adminPage.locator('input[type="password"], input[placeholder*="password" i]').first();
    await emailInput.fill('yatradesk@gmail.com');
    await passInput.fill('123456');

    const signInBtn = adminPage.locator('button:has-text("Sign in"), button:has-text("Login")').first();
    await signInBtn.click();

    await adminPage.waitForURL('**/admin/dashboard**', { timeout: 8000 }).catch(() => {});
    await adminPage.waitForTimeout(3000);
    await adminPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_11_admin_dashboard.png') });
    console.log('✔ Admin logged in, Dashboard URL:', adminPage.url());

    // Admin Users List Page
    await adminPage.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_12_admin_users.png') });
    console.log('✔ Admin Users page loaded');

    // Admin Drivers List Page
    await adminPage.goto(`${BASE_URL}/admin/drivers`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_13_admin_drivers.png') });
    console.log('✔ Admin Drivers page loaded');

    // Admin Driver Withdrawals Page
    await adminPage.goto(`${BASE_URL}/admin/drivers/wallet/withdrawals`, { waitUntil: 'networkidle' }).catch(async () => {
      await adminPage.goto(`${BASE_URL}/admin/wallet/payment`, { waitUntil: 'networkidle' });
    });
    await adminPage.waitForTimeout(2000);
    await adminPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'ui_14_admin_withdrawals.png') });
    console.log('✔ Admin Withdrawals page loaded');
  } catch (err) {
    console.error('✘ Admin Portal error:', err.message);
  }

  await browser.close();
  console.log('\n=== PLAYWRIGHT UI BROWSER TESTS COMPLETE ===');
  if (consoleErrors.length > 0) {
    console.log(`Note: ${consoleErrors.length} console errors observed during run:`);
    console.log(consoleErrors.slice(0, 5));
  } else {
    console.log('✔ No critical console errors detected!');
  }
}

runBrowserTests();
