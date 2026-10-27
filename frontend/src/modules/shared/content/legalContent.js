import { SUPPORT_INFO } from './supportInfo';

export const LEGAL_LAST_UPDATED = '27 October 2026';

const BRAND = SUPPORT_INFO.companyName;
const OPERATOR = SUPPORT_INFO.ownerName;
const EMAIL = SUPPORT_INFO.email;
const PHONE = SUPPORT_INFO.phone;
const ADDRESS = SUPPORT_INFO.officeAddress;

export const APP_AUDIENCES = {
  user: {
    key: 'user',
    appName: `${BRAND} – Rider App`,
    shortName: 'Rider App',
    prefix: '',
  },
  driver: {
    key: 'driver',
    appName: `${BRAND} – Driver & Delivery Partner App`,
    shortName: 'Driver & Delivery Partner App',
    prefix: '/driver',
  },
  agent: {
    key: 'agent',
    appName: `${BRAND} – Agent App`,
    shortName: 'Agent App',
    prefix: '/agent',
  },
};

export const getAudienceFromPath = (pathname = '') => {
  const value = pathname.toLowerCase();
  if (value.startsWith('/driver/') || value.startsWith('/taxi/driver') || value.startsWith('/taxi/owner')) return 'driver';
  if (value.startsWith('/agent/') || value.startsWith('/taxi/agent')) return 'agent';
  return 'user';
};

const grievanceSection = {
  title: 'Grievance Officer and contact',
  body: `In line with the Information Technology Act, 2000, the rules made under it and the Digital Personal Data Protection Act, 2023, the Grievance Officer for ${BRAND} is ${OPERATOR}, ${ADDRESS}. Email: ${EMAIL} · Phone: ${PHONE}. We acknowledge complaints within 48 hours and aim to resolve them within 15 days.`,
};

const governingLawSection = {
  title: 'Governing law and disputes',
  body: 'These terms are governed by the laws of India. We will first try to resolve any dispute amicably through our support team. Disputes that cannot be resolved this way fall under the exclusive jurisdiction of the competent courts having jurisdiction over Shirdi, Maharashtra.',
};

const changesSection = (doc) => ({
  title: 'Changes to this document',
  body: `We may update this ${doc} when our services, the law or our practices change. The "Last updated" date at the top shows the latest version. For significant changes we will also notify you in the app or by email. If you keep using the app after an update, you accept the revised ${doc}.`,
});

// ---------------------------------------------------------------------------
// Terms & Conditions
// ---------------------------------------------------------------------------

const userTerms = {
  label: 'Terms & Conditions',
  title: 'Terms & Conditions',
  intro: `These Terms & Conditions ("Terms") govern your use of the ${BRAND} Rider App, the website yatradesk.in and the related booking services (together, the "Platform"). ${BRAND} is operated by ${OPERATOR}, ${ADDRESS} ("we", "us", "our"). By creating an account or making a booking, you agree to these Terms.`,
  sections: [
    {
      title: 'About the Platform',
      body: `${BRAND} is a technology platform. It connects riders and customers with independent drivers, delivery partners, bus operators, travel agents and venue partners. On the Platform you can book city rides (bike, auto, cab), shared and outstation trips, airport transfers, rentals, parcel delivery, bus seats, spiritual and pilgrimage trips, and entertainment or venue tickets. Unless a booking clearly says otherwise, transport services are provided by independent partners, not by ${BRAND} directly.`,
    },
    {
      title: 'Eligibility and your account',
      bullets: [
        'You must be at least 18 years old to create an account. Minors may travel only with an adult account holder who is responsible for them.',
        'You sign in with your mobile number, verified by a one-time password (OTP). Keep your phone and OTPs secure; you are responsible for activity on your account.',
        'Your name, phone number, email and emergency contacts must be accurate and kept up to date.',
        'You may have only one account and may not transfer it to anyone else.',
      ],
    },
    {
      title: 'Bookings and fares',
      bullets: [
        'The app shows an estimated fare before you confirm. The final fare can change because of route changes, extra distance, waiting time, tolls, parking, state permits, taxes, or stops you ask for.',
        'Outstation, rental and package fares follow the package details shown at booking. Night charges, extra kilometres and extra hours are charged as shown.',
        'Promo codes and referral rewards come with their own conditions, can be withdrawn at any time, and cannot be exchanged for cash.',
        'For parcel delivery you must describe the contents correctly. Prohibited items include cash, jewellery, illegal goods, drugs, weapons, explosives, flammable or hazardous materials, live animals and anything banned by law. Drivers may refuse a parcel they believe is unsafe.',
        'Bus, venue and event bookings are also subject to the operator\'s or venue\'s own rules, timings and entry conditions.',
      ],
    },
    {
      title: 'Payments',
      bullets: [
        'You can pay in cash to the driver, through the in-app wallet, or online through our payment partners (such as PhonePe and Razorpay) using UPI, cards or net banking.',
        'Online payments are handled by licensed payment gateways. We do not store your full card details.',
        'Wallet balance can only be used for services on the Platform. It cannot be transferred and earns no interest.',
        'You must pay any amount outstanding from an earlier trip, such as a cancellation fee or unpaid cash fare, before your next booking.',
      ],
    },
    {
      title: 'Cancellations and refunds',
      body: 'Cancelling may incur a fee depending on when you cancel and whether a driver has already been assigned or has arrived. Refunds follow our Refund & Cancellation Policy, available in the app and at yatradesk.in/refund.',
    },
    {
      title: 'Your responsibilities',
      bullets: [
        'Treat drivers, partners and support staff with respect. Harassment, abuse, discrimination or violence leads to permanent suspension and may be reported to the police.',
        'Do not damage the vehicle or carry illegal items. Do not ask the driver to break traffic laws or carry more passengers than the vehicle allows.',
        'Wear a helmet on bike rides and a seat belt in cars.',
        'Do not make fake bookings, misuse promo codes, take part in referral fraud or make false chargeback claims.',
        'You must pay for any damage you cause to a vehicle or a partner\'s property.',
      ],
    },
    {
      title: 'Safety',
      body: 'The app offers an SOS button, live trip sharing and ride OTP verification. Always check the vehicle number and driver details before you start a trip. In an emergency, call 112 first.',
    },
    {
      title: 'Suspension and termination',
      body: 'We may suspend or close an account that breaks these Terms, involves fraud or unsafe conduct, or creates legal risk. You can delete your account at any time from Profile → Delete Account.',
    },
    {
      title: 'Limitation of liability',
      body: `${BRAND} acts as an intermediary. We work to keep the Platform reliable, but we do not guarantee that a vehicle will be available or arrive at a particular time. Traffic, weather and road conditions, or the actions of third parties, can cause delays. To the extent the law allows, we are not liable for indirect or consequential losses. Our total liability for any claim is limited to the fare paid for the booking in question.`,
    },
    governingLawSection,
    grievanceSection,
    changesSection('Terms'),
  ],
};

const driverTerms = {
  label: 'Partner Terms',
  title: 'Driver & Delivery Partner Terms',
  intro: `These terms ("Partner Terms") apply to drivers, delivery partners and fleet owners ("Partner", "you") who use the ${BRAND} Driver & Delivery Partner App. ${BRAND} is operated by ${OPERATOR}, ${ADDRESS}. By registering, you agree to these Partner Terms.`,
  sections: [
    {
      title: 'Nature of the relationship',
      body: `You are an independent service provider, not an employee or agent of ${BRAND}. ${BRAND} licenses you a technology platform that shows you ride, parcel and trip requests from customers. You choose when to go online and which requests to accept.`,
    },
    {
      title: 'Registration and verification',
      bullets: [
        'You must be at least 18 years old and hold a valid driving licence for the class of vehicle you operate.',
        'You must upload genuine, current documents. These include your driving licence, vehicle registration certificate (RC), insurance, permit and fitness certificate where applicable, Aadhaar or other identity proof, and a profile photo. Police verification or other documents may also be required.',
        'Your account is activated only after we review your documents. We may refuse or revoke approval if documents are false, expired or incomplete.',
        'You must renew any document before it expires and upload the renewed copy promptly.',
      ],
    },
    {
      title: 'Vehicle and conduct standards',
      bullets: [
        'Keep your vehicle roadworthy, clean, insured and compliant with the Motor Vehicles Act, 1988 and local transport rules.',
        'Never drive under the influence of alcohol or drugs, use a phone in a way that breaks the law, or let another person use your account.',
        'Follow the route the app suggests unless the customer asks for a change or there is a safety reason. Verify the ride OTP before starting a trip.',
        'Treat customers with courtesy. Harassment, discrimination, overcharging or asking for payment outside the app is not allowed.',
        'Handle parcels with care. Do not open them, and refuse any item you believe is prohibited or dangerous.',
      ],
    },
    {
      title: 'Earnings, commission and payouts',
      bullets: [
        'Fares are calculated by the app according to the fare settings for your city and vehicle type. You must not charge customers more than the fare shown in the app.',
        `${BRAND} charges a platform commission or subscription fee as shown in the app. The applicable rate is displayed before you accept trips and may be revised with notice.`,
        'For cash trips you collect the fare, and the commission is deducted from your in-app wallet. If your wallet balance becomes negative, you must recharge it before you can take new trips.',
        'You can request a withdrawal of your available wallet balance to your verified bank account or UPI ID. Payouts are processed after verification, usually within 3–7 business days.',
        'You are responsible for your own income tax, GST (if applicable) and other statutory obligations.',
      ],
    },
    {
      title: 'Cancellations and ratings',
      body: 'Frequent cancellations after accepting, or consistently low customer ratings, can lower your priority for new requests. They can also lead to temporary or permanent deactivation. If a customer cancels late, you may receive a cancellation fee according to the policy shown in the app.',
    },
    {
      title: 'Location and safety',
      body: 'While you are online, the app tracks your location, including when the app is in the background, so it can match you with nearby requests, show live tracking to customers and support safety features. The app includes an SOS button. In an emergency, call 112.',
    },
    {
      title: 'Deactivation',
      body: 'We may suspend or deactivate your account for fraud, safety incidents, document problems, repeated policy breaches, or a legal or regulatory requirement. Where reasonable, we will tell you the reason and give you a chance to respond. You may stop using the app at any time and request account deletion from Profile → Delete Account.',
    },
    {
      title: 'Limitation of liability',
      body: `You are solely responsible for operating your vehicle, for traffic offences and for any accident, injury, damage or loss caused while you provide services. To the extent the law allows, ${BRAND} is not liable for indirect or consequential losses. Its total liability is limited to the platform fees you paid in the three months before the claim.`,
    },
    governingLawSection,
    grievanceSection,
    changesSection('Partner Terms'),
  ],
};

const agentTerms = {
  label: 'Agent Terms',
  title: 'Agent Terms & Conditions',
  intro: `These terms ("Agent Terms") apply to travel agents, booking agents and business partners ("Agent", "you") who use the ${BRAND} Agent App to make bookings on behalf of customers. ${BRAND} is operated by ${OPERATOR}, ${ADDRESS}. By registering as an Agent, you agree to these Agent Terms.`,
  sections: [
    {
      title: 'Role of the Agent',
      body: `You are an independent business. As an Agent you can book rides, one-way and outstation cabs, airport transfers, shared taxis, bus seats, spiritual trips and entertainment or venue tickets for your customers through ${BRAND}. You may not present yourself as an employee or official representative of ${BRAND}.`,
    },
    {
      title: 'Registration and KYC',
      bullets: [
        'You must be at least 18 years old and able to enter into a legally binding contract.',
        'You must complete onboarding. This includes uploading the KYC and business documents the app asks for, such as identity proof, address proof, PAN, GST registration where applicable, and bank details.',
        'Your account becomes active only after admin approval. We may reject or suspend an application that has incomplete or false information.',
      ],
    },
    {
      title: 'Making bookings for customers',
      bullets: [
        'Enter accurate customer names, phone numbers, pickup and drop points and travel details. You are responsible for errors in what you enter.',
        'Get the customer\'s consent before sharing their personal details with us, and tell them that their data will be processed under our Privacy Policy.',
        'Charge the customer only the amount shown in the app plus any service fee you have clearly disclosed to them. Misleading customers about prices is not allowed.',
        'The customer\'s booking is also subject to the Rider Terms, the cancellation policy, and any bus operator or venue rules.',
      ],
    },
    {
      title: 'Wallet, commission and withdrawals',
      bullets: [
        'You earn commission on eligible bookings at the rates shown in the app for each service. Rates may be revised with notice.',
        'Commission is credited to your Agent wallet after the booking is completed. If a booking is cancelled, refunded or found to be fraudulent, the commission may be reversed.',
        'You can request a withdrawal of your available balance to your verified bank account. Withdrawals are processed after review, usually within 3–7 business days.',
        'You are responsible for your own taxes, including GST and TDS where applicable.',
      ],
    },
    {
      title: 'Referrals and QR codes',
      body: 'Your agent referral link and QR code are for genuine customer onboarding only. Self-referrals, fake accounts and other ways of gaming referral rewards lead to forfeited rewards and account suspension.',
    },
    {
      title: 'Prohibited conduct',
      bullets: [
        'Creating fake, duplicate or speculative bookings.',
        'Reselling tickets above the displayed price without disclosing it to the customer.',
        'Sharing your login with unauthorised people.',
        'Using customer data for any purpose other than the booking.',
      ],
    },
    {
      title: 'Suspension and termination',
      body: 'We may suspend or terminate an Agent account for any breach of these terms, fraud, customer complaints or legal risk. Unpaid dues and reversed commissions remain payable after termination. You may close your account at any time from Profile → Delete my account in the Agent App.',
    },
    {
      title: 'Limitation of liability',
      body: `Transport, bus and venue services are provided by independent partners. To the extent the law allows, ${BRAND} is not liable for indirect or consequential losses. Its total liability is limited to the commission earned on the booking in dispute.`,
    },
    governingLawSection,
    grievanceSection,
    changesSection('Agent Terms'),
  ],
};

// ---------------------------------------------------------------------------
// Privacy Policies
// ---------------------------------------------------------------------------

const sharedPrivacyTail = (deletionText) => [
  {
    title: 'Service providers we use',
    bullets: [
      'Google Maps Platform – maps, routes, distance and address search.',
      'Google Firebase – push notifications and app infrastructure.',
      'PhonePe and Razorpay – processing online payments and refunds.',
      'Cloudinary – secure storage of uploaded photos and documents.',
      'SMS and email providers – sending OTPs, receipts and service messages.',
      'These providers process data only on our instructions and under their own privacy and security obligations.',
    ],
  },
  {
    title: 'When we share information',
    bullets: [
      'Between the rider and the driver or partner on a booking: first name, photo, vehicle details, pickup and drop points, and live location during the trip. Phone numbers are shared only as needed to complete the trip.',
      'With bus operators, venues or agents, only as needed to fulfil a booking.',
      'With government authorities or law enforcement when the law requires it or to protect someone\'s safety.',
      'With a successor entity if the business is reorganised or transferred, under the same protections.',
      'We do not sell your personal data, and we do not share it with advertisers.',
    ],
  },
  {
    title: 'Data security',
    body: 'We protect data with encryption in transit (HTTPS/TLS), access controls, OTP-based login and restricted admin access. No online system can be guaranteed 100% secure. If a data breach affects you, we will notify you and the authorities as the law requires.',
  },
  {
    title: 'How long we keep data',
    bullets: [
      'Account information is kept while your account is active.',
      'Trip, payment and invoice records are kept as long as tax, accounting and transport laws require, usually up to 8 years.',
      'Records about safety incidents, disputes and fraud may be kept until the matter is closed and any legal limitation period has ended.',
    ],
  },
  {
    title: 'Your rights and account deletion',
    bullets: [
      'You can view and update your profile details in the app at any time.',
      'You may ask us for a copy of your data, to correct it, to delete it, or to withdraw consent, by emailing ' + EMAIL + '.',
      deletionText,
      'You can turn off location access, camera access or notifications in your phone settings. Some features will stop working without them.',
    ],
  },
  {
    title: 'Children',
    body: `${BRAND} accounts are not meant for anyone under 18, and we do not knowingly collect personal data from children. If you believe a child has created an account, please contact us and we will delete it.`,
  },
  grievanceSection,
  changesSection('Privacy Policy'),
];

const userPrivacy = {
  label: 'Privacy Policy',
  title: 'Privacy Policy',
  intro: `This Privacy Policy explains how ${BRAND} (operated by ${OPERATOR}, ${ADDRESS}) collects, uses, shares and protects your personal data when you use the ${BRAND} Rider App and yatradesk.in. We follow the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.`,
  sections: [
    {
      title: 'Information we collect',
      bullets: [
        'Account details: name, mobile number, email address, gender (optional), profile photo (optional) and emergency contacts.',
        'Location: your precise location while you use the app to set pickup points, find nearby vehicles and track your trip. The Rider App does not track your location in the background when no trip is active.',
        'Booking details: pickup and drop addresses, saved places, trip routes, fares, parcel descriptions, bus, venue and ticket bookings, ratings and reviews.',
        'Payment information: payment method, transaction ID, wallet transactions and refund status. Card and UPI details are handled by our payment partners. We do not store them.',
        'Communications: support tickets, in-app chat messages with drivers and support, and SOS alerts.',
        'Device information: device model, operating system, app version, IP address, push notification token and crash logs.',
      ],
    },
    {
      title: 'How we use your information',
      bullets: [
        'To verify your phone number with an OTP and to create and secure your account.',
        'To match you with drivers and partners, calculate fares, show live trip tracking and complete bookings.',
        'To process payments, refunds, wallet credits, referrals and promo offers.',
        'To provide safety features such as SOS, trip sharing and ride OTP verification, and to investigate incidents.',
        'To send booking updates, receipts, OTPs and important service alerts. Promotional messages are sent only if you agree to them, and you can opt out.',
        'To prevent fraud, enforce our Terms, meet legal obligations and improve the Platform.',
      ],
    },
    ...sharedPrivacyTail('You can delete your account from Profile → Delete Account in the Rider App. We delete or anonymise your personal data within 30 days, except records we must keep by law.'),
  ],
};

const driverPrivacy = {
  label: 'Partner Privacy Policy',
  title: 'Driver & Delivery Partner Privacy Policy',
  intro: `This Privacy Policy explains how ${BRAND} (operated by ${OPERATOR}, ${ADDRESS}) collects, uses, shares and protects the personal data of drivers, delivery partners and fleet owners who use the ${BRAND} Driver & Delivery Partner App. We follow the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.`,
  sections: [
    {
      title: 'Information we collect',
      bullets: [
        'Identity and contact details: name, mobile number, email, date of birth, gender, address, profile photo and emergency contacts.',
        'Verification documents: driving licence, Aadhaar or other government ID, PAN, police verification, and vehicle documents (RC, insurance, permit, fitness certificate and vehicle photos), as required for your service type.',
        'Location, including background location: while you are online, the app collects your precise location even when it is minimised or the screen is off. We use it to send you nearby requests, show customers live tracking and support safety. Location is not collected while you are offline.',
        'Trip and earnings data: requests accepted and declined, routes, trip times, fares, commissions, wallet transactions, incentives, ratings and cancellations.',
        'Bank and payout details: account holder name, bank account number, IFSC and UPI ID, used for withdrawals.',
        'Camera and photos: used only when you take or upload document, vehicle or profile photos, or proof-of-delivery photos.',
        'Device information: device model, operating system, app version, IP address, push notification token and crash logs.',
      ],
    },
    {
      title: 'How we use your information',
      bullets: [
        'To verify your identity, driving eligibility and vehicle compliance before activating your account.',
        'To send you nearby ride and delivery requests and to navigate trips.',
        'To calculate earnings and commission, manage your wallet and process payouts.',
        'To share limited details (name, photo, vehicle number, rating and live location) with customers during an active booking.',
        'For safety, incident investigation, fraud prevention and meeting transport and tax law requirements.',
        'To send trip alerts, document-expiry reminders and important account updates.',
      ],
    },
    ...sharedPrivacyTail('You can request account deletion from Profile → Delete Account in the Driver App. After any pending trips and wallet dues are settled, we delete or anonymise your personal data within 30 days, except documents and records we must keep by law.'),
  ],
};

const agentPrivacy = {
  label: 'Agent Privacy Policy',
  title: 'Agent Privacy Policy',
  intro: `This Privacy Policy explains how ${BRAND} (operated by ${OPERATOR}, ${ADDRESS}) collects, uses, shares and protects personal data in the ${BRAND} Agent App. This covers the Agent's own data and the customer data that Agents enter when they make bookings. We follow the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.`,
  sections: [
    {
      title: 'Information we collect about Agents',
      bullets: [
        'Contact and business details: name, mobile number, email, business or shop name, address, city and profile photo.',
        'KYC documents: identity proof, address proof, PAN, GST certificate (where applicable) and any other documents requested during onboarding.',
        'Bank details for commission withdrawals: account holder name, account number, IFSC and UPI ID.',
        'Activity data: bookings made, commission earned, wallet transactions, withdrawals and referrals.',
        'Location: your approximate or precise location, only when you use features such as pickup search. The Agent App does not track your location in the background.',
        'Device information: device model, operating system, app version, IP address, push notification token and crash logs.',
      ],
    },
    {
      title: 'Customer information entered by Agents',
      body: 'When you book for a customer, you give us their name, phone number, travel details and, where required, passenger details for bus or trip bookings. We use this data only to complete and support that booking. Agents must have the customer\'s consent before entering it and must not use it for any other purpose.',
    },
    {
      title: 'How we use information',
      bullets: [
        'To verify Agents and approve their accounts.',
        'To create and manage bookings, send confirmations and tickets, and provide support.',
        'To calculate and credit commission, process withdrawals and manage referral rewards.',
        'To prevent fraud, enforce the Agent Terms and meet tax and legal obligations.',
      ],
    },
    ...sharedPrivacyTail('You can delete your account from Profile → Delete my account in the Agent App. After your wallet balance and any dues are settled, we delete or anonymise your personal data within 30 days, except records we must keep by law.'),
  ],
};

// ---------------------------------------------------------------------------
// Refund & cancellation (rider-facing)
// ---------------------------------------------------------------------------

const refund = {
  label: 'Refund Policy',
  title: 'Refund & Cancellation Policy',
  intro: `This policy explains when cancellation fees apply and how refunds work for bookings made on ${BRAND}. We review each refund using the booking status, the time of cancellation and the payment method.`,
  sections: [
    {
      title: 'Cancellation fees',
      bullets: [
        'City rides (bike, auto, cab): cancelling is free before a driver is assigned and for a short grace period after. Once the driver is on the way or has arrived, a cancellation fee may apply. The fee is shown in the app before you confirm the cancellation.',
        'Outstation, rental and airport bookings: free cancellation up to the time shown on the booking. After that, part of the fare may be charged.',
        'Bus seats, spiritual trips and venue or event tickets: the operator\'s or venue\'s cancellation rules apply and are shown at booking. Some tickets cannot be refunded.',
        'Parcel delivery: once the parcel has been picked up, the booking cannot be refunded.',
        'Customer no-shows, and cancellations after a trip has started, cannot be refunded.',
      ],
    },
    {
      title: 'When refunds are given',
      bullets: [
        'Duplicate payment, or an overcharge we have verified.',
        'A booking cancelled by the driver, operator or platform after you paid online.',
        'A service that could not be provided for reasons that were not your fault.',
        'A cancellation made within the free cancellation window.',
      ],
    },
    {
      title: 'Refund timelines',
      bullets: [
        'Refunds to your in-app wallet: instant to 24 hours after approval.',
        'UPI refunds: usually 1–3 business days after approval.',
        'Card and net banking refunds: usually 5–10 business days after approval, depending on your bank.',
      ],
    },
    {
      title: 'How to ask for a refund',
      body: `Raise a ticket from Help & Support in the app, or email ${EMAIL} with your booking ID, payment reference and reason. Please contact us within 7 days of the booking.`,
    },
    grievanceSection,
  ],
};

const LEGAL_DOCUMENTS = {
  user: { terms: userTerms, privacy: userPrivacy, refund, cancellation: refund },
  driver: { terms: driverTerms, privacy: driverPrivacy },
  agent: { terms: agentTerms, privacy: agentPrivacy },
};

export const getLegalDocument = (audience, type) =>
  LEGAL_DOCUMENTS[audience]?.[type] || LEGAL_DOCUMENTS.user[type] || LEGAL_DOCUMENTS.user.terms;

// ---------------------------------------------------------------------------
// Support FAQs
// ---------------------------------------------------------------------------

export const SUPPORT_FAQS = {
  user: [
    { q: 'How do I book a ride or send a parcel?', a: 'Open the app, enter your pickup and drop location, choose a vehicle or service, and confirm. You will see the driver details and live tracking once a driver accepts.' },
    { q: 'I was charged incorrectly. What should I do?', a: 'Go to Activity, open the trip, and raise a support ticket. Our team checks the trip record and refunds any verified overcharge.' },
    { q: 'How do I get a refund?', a: 'Eligible refunds are credited to your wallet or original payment method. See the Refund Policy for timelines.' },
    { q: 'I left something in the vehicle.', a: 'Open the trip in Activity and contact the driver, or raise a support ticket and we will help you get in touch.' },
    { q: 'How do I delete my account?', a: 'Go to Profile → Delete Account. Your personal data is removed within 30 days, except records we must keep by law.' },
  ],
  driver: [
    { q: 'How do I register as a driver or delivery partner?', a: 'Sign in with your mobile number, fill in your details, choose your vehicle type and upload the required documents. Your account is activated after verification.' },
    { q: 'My documents are pending or rejected.', a: 'Check the registration status screen for the reason, re-upload clear and valid documents, or contact support.' },
    { q: 'How do I withdraw my earnings?', a: 'Go to Wallet → Withdraw, enter the amount and confirm. Payouts reach your verified bank account or UPI ID after review, usually within 3–7 business days.' },
    { q: 'Why can\'t I go online?', a: 'Common reasons are pending document approval, an expired document or a negative wallet balance. Recharge your wallet or update documents, then try again.' },
    { q: 'How do I delete my partner account?', a: 'Go to Profile → Delete Account. Pending trips and wallet dues must be settled first.' },
  ],
  agent: [
    { q: 'How do I become an agent?', a: 'Sign in with your mobile number, complete onboarding with your business and KYC details, and wait for admin approval.' },
    { q: 'How is my commission calculated?', a: 'Commission rates for each service are shown in the app. Commission is credited to your wallet after the booking is completed.' },
    { q: 'How do I withdraw my commission?', a: 'Go to Wallet, request a withdrawal to your verified bank account, and the amount is transferred after review.' },
    { q: 'A customer wants to cancel a booking.', a: 'Open the booking in Bookings and cancel it. The cancellation policy for that service applies, and any commission on the booking is reversed.' },
    { q: 'How do I delete my agent account?', a: 'Go to Profile → Delete my account and submit the request. Withdraw your wallet balance first. We delete your account and personal data within 30 days after any dues are settled.' },
  ],
};
