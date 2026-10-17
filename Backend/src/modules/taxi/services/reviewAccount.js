// Fixed login for Play Store / App Store reviewers: this phone accepts a fixed
// OTP in every app (user, agent, driver and the other driver-app roles).
export const REVIEW_PHONE = '9770133148';
export const REVIEW_OTP = '0000';

export const isReviewPhone = (normalizedPhone) => String(normalizedPhone || '') === REVIEW_PHONE;
