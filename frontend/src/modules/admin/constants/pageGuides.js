/**
 * Centralized Page Guides & Knowledge Base for Admin Panel
 * Simple, plain-language operational guides for every page.
 */

export const PAGE_GUIDES = [
  // ===================== DASHBOARD & ANALYTICS =====================
  {
    id: 'dashboard',
    path: '/admin/dashboard',
    match: (pathname) => pathname === '/admin/dashboard' || pathname === '/admin',
    title: 'Executive Dashboard',
    category: 'Home & Analytics',
    summary: 'Real-time birds-eye view of your entire transport platform operations, financials, and live activity.',
    overview: 'This is the main command center for the platform administrator. It provides key operational metrics including live ongoing rides, total driver counts, active users, today’s gross revenue, and pending approval queues.',
    keyActions: [
      { title: 'Live Stat Cards', desc: 'Monitor active drivers, completed rides, total users, and revenue generated in real-time.' },
      { title: 'Revenue & Trip Charts', desc: 'Analyze daily, weekly, and monthly growth trends in bookings and platform earnings.' },
      { title: 'Quick Action Shortcuts', desc: 'Jump straight to pending driver approvals, active SOS alerts, or unresolved support tickets.' },
      { title: 'Recent Activity Stream', desc: 'Check the latest booking confirmations, user registrations, and completed trips.' },
    ],
    steps: [
      { step: 1, title: 'Check Daily Performance', desc: 'Review the top metric cards at the start of your shift to ensure daily targets and driver supplies are optimal.' },
      { step: 2, title: 'Inspect Alerts', desc: 'Check if there are pending driver verifications or emergency SOS notifications.' },
      { step: 3, title: 'Review Revenue Trends', desc: 'Analyze the revenue charts to identify peak hours and highest-demand zones.' },
    ],
    tips: [
      'Stat cards update automatically with real-time socket events.',
      'Click on any quick alert card to navigate directly to that management screen.',
    ],
    relatedPaths: ['/admin/earnings', '/admin/trips', '/admin/drivers/pending'],
  },
  {
    id: 'admin-earnings',
    path: '/admin/earnings',
    match: (pathname) => pathname.startsWith('/admin/earnings'),
    title: 'Admin Earnings & Financials',
    category: 'Financials',
    summary: 'Detailed financial ledger of platform commissions, trip revenues, tax collections, and driver payouts.',
    overview: 'This page helps you track platform commission earned from completed trips, delivery orders, rental bookings, and bus tickets. You can filter by date ranges, service types, and payment gateways.',
    keyActions: [
      { title: 'Net Platform Commission', desc: 'View net revenue after deducting driver payouts and promotional discounts.' },
      { title: 'Payment Mode Breakdown', desc: 'See earnings segregated by Cash, In-App Wallet, and Online Payment Gateways (Razorpay/Stripe/PhonePe).' },
      { title: 'Date Range Filters', desc: 'Filter financial reports by Today, This Week, This Month, or Custom Date ranges.' },
      { title: 'Export Financial Reports', desc: 'Download CSV/Excel reports for accounting and tax compliance.' },
    ],
    steps: [
      { step: 1, title: 'Select Date Range', desc: 'Choose the accounting period you want to review using the date filter.' },
      { step: 2, title: 'Filter by Service', desc: 'Inspect individual revenue streams like Cabs, Deliveries, Rentals, or Bus Bookings.' },
      { step: 3, title: 'Reconcile Gateways', desc: 'Compare online gateway settlement totals against platform recorded earnings.' },
    ],
    tips: [
      'Commission rates are configured in Price Management & Vehicle Settings.',
      'Wallet transactions settle automatically upon ride completion.',
    ],
    relatedPaths: ['/admin/pricing/set-price', '/admin/wallet/payment', '/admin/reports/finance'],
  },

  // ===================== OPERATIONS =====================
  {
    id: 'live-chat',
    path: '/admin/chat',
    match: (pathname) => pathname.startsWith('/admin/chat'),
    title: 'Live Support & User-Driver Chat',
    category: 'Operations',
    summary: 'Real-time two-way messaging terminal with passengers, drivers, and fleet owners for instant dispute resolution.',
    overview: 'Customer support agents and administrators use this screen to directly converse with riders and drivers who have opened support inquiries or need assistance during active rides.',
    keyActions: [
      { title: 'Active Chat List', desc: 'See incoming chats ordered by most recent unread messages.' },
      { title: 'Live Conversation Window', desc: 'Send text replies, helpful links, and operational status updates directly to users or drivers.' },
      { title: 'Role Badges', desc: 'Instantly identify whether the conversation is with a Driver, Rider, or Fleet Owner.' },
      { title: 'Mark as Resolved', desc: 'Archive or clear finished conversations to maintain an organized inbox.' },
    ],
    steps: [
      { step: 1, title: 'Select Conversation', desc: 'Click any thread with unread indicator badges.' },
      { step: 2, title: 'Inspect User Details', desc: 'Review the customer/driver profile and trip reference associated with the query.' },
      { step: 3, title: 'Resolve Issue', desc: 'Send your response and close or follow up on the inquiry.' },
    ],
    tips: [
      'New incoming messages sound an alert and pop up in the top intelligence feed.',
      'Keep chat responses polite, concise, and professional.',
    ],
    relatedPaths: ['/admin/support/tickets', '/admin/trips'],
  },
  {
    id: 'trips',
    path: '/admin/trips',
    match: (pathname) => pathname.startsWith('/admin/trips'),
    title: 'Trip Requests & Ride Management',
    category: 'Operations',
    summary: 'Comprehensive registry of all taxi, cab, and auto ride requests across all status lifecycles.',
    overview: 'Monitor every single ride booked on the platform. View live statuses including Requested, Driver Assigned, In Progress, Completed, and Cancelled trips with complete GPS route coordinates and fare breakdowns.',
    keyActions: [
      { title: 'Status Filters', desc: 'Filter trips by Completed, Ongoing, Cancelled, or Driver Unassigned.' },
      { title: 'Trip Details & GPS Route', desc: 'View pickup point, destination, actual route traveled, driver details, and rider contact.' },
      { title: 'Fare & Payment Breakdown', desc: 'Inspect base fare, distance charge, surge multipliers, waiting charges, taxes, and tips.' },
      { title: 'Cancellation Reason', desc: 'Analyze why a ride was cancelled (driver cancelled, passenger cancelled, or system timeout).' },
    ],
    steps: [
      { step: 1, title: 'Search Trip', desc: 'Search by Booking ID, Customer Name, Driver Name, or Date.' },
      { step: 2, title: 'Inspect Status', desc: 'Click on any trip to see the complete timeline from request to drop-off.' },
      { step: 3, title: 'Manage Disputes', desc: 'Review customer ratings, complaints, or refund requests if applicable.' },
    ],
    tips: [
      'Use the filter dropdown to quickly find cancelled rides and review cancellation penalty charges.',
    ],
    relatedPaths: ['/admin/ongoing', '/admin/deliveries', '/admin/safety'],
  },
  {
    id: 'deliveries',
    path: '/admin/deliveries',
    match: (pathname) => pathname.startsWith('/admin/deliveries'),
    title: 'Delivery & Parcel Requests',
    category: 'Operations',
    summary: 'Manage parcel delivery orders, courier packages, sender/receiver details, and delivery proofs.',
    overview: 'Track parcel orders sent across town. Admins can verify sender details, receiver contacts, parcel dimensions, goods category, OTP verification status, and delivery confirmation photos.',
    keyActions: [
      { title: 'Order Tracking', desc: 'Follow parcel journey from sender pickup to recipient doorstep delivery.' },
      { title: 'Goods Verification', desc: 'Check parcel weight category and package type declaration.' },
      { title: 'Sender & Receiver Info', desc: 'Access phone numbers and delivery instructions for both parties.' },
      { title: 'Delivery OTP Verification', desc: 'Ensure parcel handovers are secured via driver verification OTP.' },
    ],
    steps: [
      { step: 1, title: 'Review Incoming Parcels', desc: 'Check orders awaiting driver assignment.' },
      { step: 2, title: 'Track In-Transit Deliveries', desc: 'Monitor active couriers moving towards destination.' },
      { step: 3, title: 'Audit Completed Deliveries', desc: 'Verify recipient confirmation and fare payment.' },
    ],
    tips: [
      'Goods types and restrictions can be configured in Price Management -> Goods Types.',
    ],
    relatedPaths: ['/admin/pricing/goods-types', '/admin/trips'],
  },
  {
    id: 'ongoing',
    path: '/admin/ongoing',
    match: (pathname) => pathname.startsWith('/admin/ongoing'),
    title: 'Active / Ongoing Requests',
    category: 'Operations',
    summary: 'Live real-time monitoring monitor for all currently running trips and active deliveries on the road.',
    overview: 'A focused operational console showing only rides and deliveries currently in-progress. Ideal for dispatchers and operations managers overseeing on-road safety and service quality.',
    keyActions: [
      { title: 'Live Progress Tracker', desc: 'See elapsed trip time, distance remaining, and estimated time of arrival.' },
      { title: 'Emergency Dispatch', desc: 'Directly initiate emergency protocols or call driver/passenger if anomalous stops occur.' },
    ],
    steps: [
      { step: 1, title: 'Monitor Active Trips', desc: 'Keep watch on prolonged trips or unusually delayed arrivals.' },
      { step: 2, title: 'Assist Drivers', desc: 'Intervene if a driver requires route re-routing or passenger contact support.' },
    ],
    tips: [
      'Combine this with Geofencing / "God\'s Eye" view for a map-based overview of active vehicles.',
    ],
    relatedPaths: ['/admin/geo/gods-eye', '/admin/trips', '/admin/safety'],
  },
  {
    id: 'safety',
    path: '/admin/safety',
    match: (pathname) => pathname.startsWith('/admin/safety'),
    title: 'SOS Emergency & Safety Console',
    category: 'Safety & Security',
    summary: 'Real-time emergency distress response system for active driver and passenger SOS triggers.',
    overview: 'When a rider or driver presses the in-app SOS Panic button, high-priority audible and visual alerts trigger here immediately. Displays real-time GPS location, vehicle details, emergency contacts, and direct authority dispatch tools.',
    keyActions: [
      { title: 'Instant Alert Feed', desc: 'Pops up immediate alert with siren sound, map coordinates, and user details.' },
      { title: 'Emergency Contact Access', desc: 'View registered emergency contacts and local law enforcement dispatch hotlines.' },
      { title: 'Audit Trail & Incident Log', desc: 'Record incident notes, police involvement details, and resolution status.' },
    ],
    steps: [
      { step: 1, title: 'Respond to Alert', desc: 'Immediately open active SOS alert to get live location coordinates.' },
      { step: 2, title: 'Contact User & Driver', desc: 'Call the user and driver to assess the immediate emergency.' },
      { step: 3, title: 'Dispatch Assistance', desc: 'Alert nearest patrol or emergency services and update the incident log.' },
    ],
    tips: [
      'Never leave an unresolved SOS ticket in pending status.',
    ],
    relatedPaths: ['/admin/trips', '/admin/drivers'],
  },

  // ===================== CUSTOMER MANAGEMENT =====================
  {
    id: 'users',
    path: '/admin/users',
    match: (pathname) => pathname === '/admin/users' || (pathname.startsWith('/admin/users') && !pathname.includes('subscription') && !pathname.includes('delete') && !pathname.includes('bulk')),
    title: 'Customer Management (Users)',
    category: 'Customer Management',
    summary: 'View, search, manage, and inspect all registered rider accounts across the platform.',
    overview: 'Manage the customer base. View user contact info, wallet balances, ride histories, ratings, account statuses (Active / Suspended), and edit customer profiles.',
    keyActions: [
      { title: 'User Search & Filter', desc: 'Quickly find users by Name, Phone Number, Email, or Registration Date.' },
      { title: 'Status Toggle', desc: 'Block or activate user accounts if policy violations or fraudulent chargebacks occur.' },
      { title: 'Wallet Balance & Adjustments', desc: 'Inspect user wallet balance and manually credit/debit for promotions or refunds.' },
      { title: 'Ride History', desc: 'View all past rides, cancellations, and ratings submitted by this user.' },
    ],
    steps: [
      { step: 1, title: 'Search Customer', desc: 'Type phone number or email in the search bar.' },
      { step: 2, title: 'View Customer Profile', desc: 'Click View Details to inspect wallet, rating, and booking log.' },
      { step: 3, title: 'Take Action', desc: 'Update status, credit wallet, or review support tickets.' },
    ],
    tips: [
      'Account bans take effect immediately, preventing new ride bookings.',
    ],
    relatedPaths: ['/admin/users/subscriptions', '/admin/wallet/payment', '/admin/referrals/user-settings'],
  },
  {
    id: 'user-subscriptions',
    path: '/admin/users/subscriptions',
    match: (pathname) => pathname.startsWith('/admin/users/subscriptions'),
    title: 'User Subscription Management',
    category: 'Customer Management',
    summary: 'Create, edit, and track VIP user membership plans with zero commission, discounted rides, or free priority booking.',
    overview: 'Subscription packages encourage rider loyalty. Admins can configure recurring weekly/monthly pass plans offering benefits like 0% surge charges, 10% discount on all cab rides, or free cancellation perks.',
    keyActions: [
      { title: 'Create Subscription Plan', desc: 'Define plan name, pricing, duration (daily/weekly/monthly/annual), and discount percentage.' },
      { title: 'Active Subscribers List', desc: 'Monitor active subscriber members, renewal dates, and revenue generated from subscription fees.' },
      { title: 'Feature Toggles', desc: 'Enable perks such as free cancellations, priority driver dispatch, and surge protection.' },
    ],
    steps: [
      { step: 1, title: 'Define Plan Perks', desc: 'Click "Create Plan" and enter pricing, duration, and ride discount %.' },
      { step: 2, title: 'Publish Plan', desc: 'Activate plan so it appears in the passenger app under "Subscriptions".' },
      { step: 3, title: 'Track Enrollments', desc: 'Review member renewals and plan adoption rates.' },
    ],
    tips: [
      'Highlight premium plans with badge labels to increase subscriber conversions.',
    ],
    relatedPaths: ['/admin/users', '/admin/promotions/promo-codes'],
  },

  // ===================== DRIVER MANAGEMENT =====================
  {
    id: 'drivers-pending',
    path: '/admin/drivers/pending',
    match: (pathname) => pathname.startsWith('/admin/drivers/pending'),
    title: 'Pending Driver Registrations',
    category: 'Driver Management',
    summary: 'Verification desk for new driver applications awaiting document review and background approval.',
    overview: 'Before a new driver can go online and accept trips, their uploaded KYC documents (Driving License, Vehicle RC, Insurance, Police Verification, Vehicle Photos) must be verified here by an admin.',
    keyActions: [
      { title: 'Document Inspection', desc: 'Zoom into uploaded document scans, verify document numbers, and check expiry dates.' },
      { title: 'Approve Driver', desc: 'Approve verified driver profile to grant immediate platform access.' },
      { title: 'Reject with Reason', desc: 'Reject blurry or invalid documents with clear feedback sent to driver app for re-upload.' },
    ],
    steps: [
      { step: 1, title: 'Select Application', desc: 'Click on a pending driver from the queue.' },
      { step: 2, title: 'Verify All Documents', desc: 'Check License validity, RC name match, Insurance date, and vehicle photos.' },
      { step: 3, title: 'Assign Vehicle Type & Approve', desc: 'Ensure correct vehicle category (Bike/Sedan/SUV/Auto) is assigned, then click Approve.' },
    ],
    tips: [
      'Always reject with a descriptive reason so the driver knows which specific document to re-upload.',
    ],
    relatedPaths: ['/admin/drivers', '/admin/drivers/documents'],
  },
  {
    id: 'drivers-approved',
    path: '/admin/drivers',
    match: (pathname) => pathname === '/admin/drivers' || pathname.startsWith('/admin/drivers/active'),
    title: 'Approved & Active Drivers',
    category: 'Driver Management',
    summary: 'Manage all approved platform drivers, their online status, duty shifts, and vehicle assignments.',
    overview: 'Central directory of all active and offline drivers. View driver performance metrics, acceptance rates, cancellation counts, vehicle registration details, and total earnings.',
    keyActions: [
      { title: 'Driver Search & Filters', desc: 'Filter drivers by Service Type, Vehicle Model, Online/Offline status, and City.' },
      { title: 'Account Status Management', desc: 'Temporarily suspend or ban drivers violating terms or exhibiting unsafe driving.' },
      { title: 'Edit Driver Details', desc: 'Update vehicle numbers, assigned vehicle category, or contact details.' },
      { title: 'View Duty Logs', desc: 'Review login/logout times and total duty hours for payroll and incentives.' },
    ],
    steps: [
      { step: 1, title: 'Locate Driver', desc: 'Search by driver name, phone number, or vehicle registration plate.' },
      { step: 2, title: 'Review Details', desc: 'Inspect driver ratings, wallet balance, and recent completed trips.' },
      { step: 3, title: 'Manage Account', desc: 'Update vehicle assignment, adjust commission rates, or manage status.' },
    ],
    tips: [
      'Drivers with low ratings can be placed on probation or re-training review.',
    ],
    relatedPaths: ['/admin/drivers/pending', '/admin/drivers/wallet/withdrawals', '/admin/drivers/ratings'],
  },
  {
    id: 'driver-wallet',
    path: '/admin/drivers/wallet/withdrawals',
    match: (pathname) => pathname.startsWith('/admin/drivers/wallet'),
    title: 'Driver Wallet & Payout Withdrawals',
    category: 'Driver Management',
    summary: 'Manage driver payout requests, bank transfers, negative wallet balance recovery, and commission settlement.',
    overview: 'Drivers request cash withdrawals from their accumulated trip earnings. Admins inspect bank account details (UPI/NEFT/IMPS), verify balance sufficiency, and approve or execute payouts.',
    keyActions: [
      { title: 'Approve Payout Requests', desc: 'Review pending payout requests, verify bank IFSC/UPI, and mark as Transferred.' },
      { title: 'Negative Balance Monitor', desc: 'View drivers who owe platform commission from cash rides and send top-up reminders.' },
      { title: 'Manual Wallet Adjustments', desc: 'Credit bonuses, incentive payouts, or manual toll fare adjustments.' },
    ],
    steps: [
      { step: 1, title: 'Review Pending Requests', desc: 'Check driver payout requests waiting for bank clearance.' },
      { step: 2, title: 'Process Bank Transfer', desc: 'Disburse funds via your banking portal or automated gateway.' },
      { step: 3, title: 'Mark Transferred with UTR', desc: 'Enter transaction reference number (UTR) and confirm payout.' },
    ],
    tips: [
      'Automated payout integrations can be linked under Third-party Payment Gateway Settings.',
    ],
    relatedPaths: ['/admin/drivers', '/admin/wallet/payment', '/admin/earnings'],
  },
  {
    id: 'driver-ratings',
    path: '/admin/drivers/ratings',
    match: (pathname) => pathname.startsWith('/admin/drivers/ratings'),
    title: 'Driver Ratings & Customer Reviews',
    category: 'Driver Management',
    summary: 'Monitor passenger feedback, star ratings, behavior reports, and service quality trends.',
    overview: 'Quality control hub to ensure passenger satisfaction. View average star ratings, customer feedback tags (clean car, polite behavior, rash driving, AC issue), and investigate bad ratings.',
    keyActions: [
      { title: 'Rating Distribution', desc: 'Track 5-star versus 1-star ratios across all service types.' },
      { title: 'Review Individual Feedback', desc: 'Read customer complaints and comments attached to specific trip IDs.' },
      { title: 'Filter Low Rated Drivers', desc: 'Identify drivers falling below minimum quality threshold for review.' },
    ],
    steps: [
      { step: 1, title: 'Filter by Star Rating', desc: 'Filter for 1-star and 2-star reviews to pinpoint problem areas.' },
      { step: 2, title: 'Inspect Trip Log', desc: 'Click into the linked trip to see driver and rider comments.' },
    ],
    tips: [
      'High rated drivers can be rewarded with priority dispatch algorithms and badge achievements.',
    ],
    relatedPaths: ['/admin/drivers', '/admin/trips'],
  },
  {
    id: 'driver-documents',
    path: '/admin/drivers/documents',
    match: (pathname) => pathname.startsWith('/admin/drivers/documents'),
    title: 'Driver Needed Documents Configuration',
    category: 'Driver Management',
    summary: 'Configure mandatory and optional document upload requirements for driver onboarding.',
    overview: 'Define which legal documents drivers must provide during sign-up (e.g. Aadhar Card, Driving License, Commercial Permit, Vehicle Insurance, Pollution Certificate).',
    keyActions: [
      { title: 'Add Document Requirement', desc: 'Create new required document with custom name, expiry date requirement, and guidelines.' },
      { title: 'Mandatory / Optional Toggle', desc: 'Choose whether this document blocks sign-up or can be submitted later.' },
      { title: 'Expiry Tracking Rules', desc: 'Enforce automatic system warnings before a driver’s license or insurance expires.' },
    ],
    steps: [
      { step: 1, title: 'Create Document Type', desc: 'Click "Add Document" and specify title and description.' },
      { step: 2, title: 'Set Validation Rules', desc: 'Toggle "Requires Expiry Date" and "Identify Front & Back Scans".' },
      { step: 3, title: 'Save Configuration', desc: 'Newly configured documents will immediately appear in the driver registration form.' },
    ],
    tips: [
      'Enabling expiry tracking helps you prevent drivers from operating with invalid commercial insurance.',
    ],
    relatedPaths: ['/admin/drivers/pending', '/admin/drivers'],
  },

  // ===================== AGENT MANAGEMENT =====================
  {
    id: 'agents',
    path: '/admin/agents',
    match: (pathname) => pathname.startsWith('/admin/agents') && !pathname.includes('commission') && !pathname.includes('documents') && !pathname.includes('withdrawals'),
    title: 'Agent Management',
    category: 'Agent Management',
    summary: 'Manage offline booking agents, travel desks, hotel concierges, and affiliate partners.',
    overview: 'Agents can book rides and intercity buses on behalf of walk-in customers or guests using their dedicated agent portal. Track agent commissions, active bookings, and wallet settlements.',
    keyActions: [
      { title: 'Agent Onboarding & KYC', desc: 'Approve new agent registrations and verify business/agency licenses.' },
      { title: 'Commission Rates', desc: 'Set custom commission percentage earned by agents per ride or bus booking.' },
      { title: 'Booking Performance', desc: 'View gross booking volume and customer conversion stats generated by each agent.' },
    ],
    steps: [
      { step: 1, title: 'Approve Pending Agents', desc: 'Verify travel agency credentials and approve portal access.' },
      { step: 2, title: 'Set Commission', desc: 'Assign default or custom tier commissions in Agent Commission Defaults.' },
      { step: 3, title: 'Monitor Bookings', desc: 'Review passenger rides booked through travel desk agents.' },
    ],
    tips: [
      'Agents help capture non-app users such as tourists, hotel guests, and elderly passengers.',
    ],
    relatedPaths: ['/admin/agents/commission-defaults', '/admin/agents/bookings', '/admin/agents/withdrawals'],
  },

  // ===================== BUS SERVICE =====================
  {
    id: 'bus-service',
    path: '/admin/bus-service',
    match: (pathname) => pathname === '/admin/bus-service' || (pathname.startsWith('/admin/bus-service') && !pathname.includes('commission') && !pathname.includes('bookings')),
    title: 'Bus Service & Fleet Manager',
    category: 'Bus Service',
    summary: 'Manage intercity bus routes, schedules, seat layouts, ticket pricing, and fleet operators.',
    overview: 'Full-featured intercity bus ticketing and route management. Create scheduled bus lines with departure/arrival cities, boarding & drop-off points, dynamic seat layouts (sleeper, semi-sleeper, seater), and amenities.',
    keyActions: [
      { title: 'Create Bus Route', desc: 'Define origin, destination, intermediate boarding stops, and departure timings.' },
      { title: 'Seat Layout Designer', desc: 'Configure 2x2, 2x1, or Double-Decker Sleeper seat charts with individual seat prices.' },
      { title: 'Bus Operator Assignment', desc: 'Assign bus drivers and fleet owners to specific service schedules.' },
      { title: 'Pricing & Cancellation Policies', desc: 'Set base seat fares, holiday price surges, and refund deduction slabs.' },
    ],
    steps: [
      { step: 1, title: 'Add New Bus Service', desc: 'Click "Add Bus Service" and specify Bus Name, Bus Number, and Type (AC Sleeper / Seater).' },
      { step: 2, title: 'Configure Route & Stops', desc: 'Add boarding points with exact pickup times and drop locations.' },
      { step: 3, title: 'Set Seat Fares & Publish', desc: 'Design seat matrix, set sleeper vs seater fares, and publish the schedule.' },
    ],
    tips: [
      'Real-time GPS tracking can be enabled for passengers through the Bus Driver app.',
    ],
    relatedPaths: ['/admin/bus-service/bookings', '/admin/bus-service/commission'],
  },
  {
    id: 'bus-bookings',
    path: '/admin/bus-service/bookings',
    match: (pathname) => pathname.startsWith('/admin/bus-service/bookings'),
    title: 'Bus Ticket Bookings & Passengers',
    category: 'Bus Service',
    summary: 'Inspect bus passenger manifests, ticket reservations, seat allocations, and boarding confirmations.',
    overview: 'View all confirmed, boarded, cancelled, or refunded bus tickets across all scheduled bus services. Generate passenger manifests for conductors and manage ticket cancellations.',
    keyActions: [
      { title: 'Passenger Manifest', desc: 'View passenger names, contact numbers, selected seat numbers, and boarding points.' },
      { title: 'Ticket QR Verification', desc: 'Verify passenger ticket QR codes and boarding check-in status.' },
      { title: 'Process Cancellations & Refunds', desc: 'Calculate cancellation deduction fees and trigger instant wallet/bank refunds.' },
    ],
    steps: [
      { step: 1, title: 'Search Booking', desc: 'Search by PNR Ticket ID, Passenger Phone, or Bus Service Name.' },
      { step: 2, title: 'Inspect Seat Details', desc: 'Check seat numbers and boarding point timing.' },
      { step: 3, title: 'Manage Status', desc: 'Re-send SMS ticket or process cancellation upon customer request.' },
    ],
    tips: [
      'Passenger manifests can be exported to PDF for bus conductors prior to departure.',
    ],
    relatedPaths: ['/admin/bus-service', '/admin/bus-service/commission'],
  },

  // ===================== CAR POOLING =====================
  {
    id: 'car-pooling',
    path: '/admin/pooling',
    match: (pathname) => pathname.startsWith('/admin/pooling'),
    title: 'Car Pooling & Ride Sharing',
    category: 'Car Pooling',
    summary: 'Manage shared ride corridors, co-passenger seat bookings, route stops, and pooling commission.',
    overview: 'Allows verified drivers and commuters to offer empty seats on regular daily commuting or intercity corridors. Admins control seat commission, route validation, and passenger matching.',
    keyActions: [
      { title: 'Pooling Routes & Corridors', desc: 'Define popular commuter routes, highway waypoints, and suggested seat rates.' },
      { title: 'Vehicle & Host Verification', desc: 'Verify car owner credentials, RC, and safety checks before ride sharing.' },
      { title: 'Pooling Bookings', desc: 'Monitor co-passengers sharing rides and per-seat fare transactions.' },
    ],
    steps: [
      { step: 1, title: 'Configure Pooling Commission', desc: 'Set platform commission % for shared seat rides.' },
      { step: 2, title: 'Review Route Listings', desc: 'Inspect driver-created pooling schedules and pricing.' },
      { step: 3, title: 'Manage Co-Passenger Trips', desc: 'Ensure safe ride completion and OTP-verified passenger pickups.' },
    ],
    tips: [
      'Carpooling increases ride density and reduces passenger travel costs on popular corridors.',
    ],
    relatedPaths: ['/admin/pooling/commission', '/admin/pooling/routes', '/admin/pooling/bookings'],
  },

  // ===================== RENTAL MANAGEMENT =====================
  {
    id: 'rental-management',
    path: '/admin/pricing/rental',
    match: (pathname) => pathname.includes('rental'),
    title: 'Vehicle Rental & Self-Drive Fleet',
    category: 'Rentals',
    summary: 'Manage self-drive bike/car rentals, rental hubs, hourly/daily package pricing, KYC, and security deposits.',
    overview: 'Manage the self-drive rental ecosystem. Configure rental vehicles (Bikes, Scooters, Sedans, SUVs), rental stations/stores, daily/weekly/monthly hire packages, refundable security deposits, and customer KYC verification.',
    keyActions: [
      { title: 'Rental Vehicle Inventory', desc: 'Add rental bikes/cars with odometer readings, fuel rules, and deposit amounts.' },
      { title: 'Rental Hubs & Stores', desc: 'Define physical pickup and return garage locations on the map.' },
      { title: 'Package Pricing Plans', desc: 'Create Hourly (e.g. 4 Hours / 40 km) and Multi-Day rental plans.' },
      { title: 'Live Vehicle Tracking', desc: 'Track GPS locations of vehicles currently out on active rental hire.' },
    ],
    steps: [
      { step: 1, title: 'Add Store Hubs', desc: 'Define garage locations where customers can pick up vehicles.' },
      { step: 2, title: 'Add Rental Fleet', desc: 'Register vehicles with registration plates, insurance, and photo proofs.' },
      { step: 3, title: 'Verify Customer KYC', desc: 'Approve Driving License and national ID before handing over vehicle keys.' },
    ],
    tips: [
      'Always inspect vehicle return photos and odometer readings before releasing security deposits.',
    ],
    relatedPaths: ['/admin/pricing/rental-vehicles', '/admin/pricing/rental-tracking', '/admin/pricing/rental-packages'],
  },

  // ===================== PRICE MANAGEMENT & GEOFENCING =====================
  {
    id: 'price-management',
    path: '/admin/pricing',
    match: (pathname) => pathname.startsWith('/admin/pricing') && !pathname.includes('rental'),
    title: 'Price Management, Zones & Vehicle Types',
    category: 'Price Management',
    summary: 'Configure base fares, per-km rates, waiting fees, geofenced zones, airport flat rates, and vehicle categories.',
    overview: 'The core pricing engine for your taxi platform. Define rates per service location, draw polygonal geofence zones, set airport surcharges, and configure vehicle specifications (Bike, Auto, Hatchback, Sedan, SUV, Luxury).',
    keyActions: [
      { title: 'Service Locations & Cities', desc: 'Enable/disable platform operations in specific cities or territories.' },
      { title: 'Geofence Zone Drawing', desc: 'Draw custom operational boundaries, high-demand zones, and restricted regions on interactive maps.' },
      { title: 'Set Price Engine', desc: 'Set Base Fare, Min Fare, Rate per KM, Rate per Minute, Waiting Charge, and Night Surcharges.' },
      { title: 'Airport Flat Pricing', desc: 'Configure fixed corridor fares between city centers and international/domestic airports.' },
      { title: 'Vehicle Type Catalog', desc: 'Manage vehicle categories, seat capacities, icons, and base amenities.' },
    ],
    steps: [
      { step: 1, title: 'Create Service Location', desc: 'Add your target city/state and currency symbol.' },
      { step: 2, title: 'Draw Geofence Zone', desc: 'Use the map polygon tool to outline operating boundaries.' },
      { step: 3, title: 'Configure Vehicle Rates', desc: 'Set standard base fares and per-kilometer rates for each vehicle type.' },
    ],
    tips: [
      'Ensure zones do not overlap improperly to avoid fare calculation ambiguity for riders.',
    ],
    relatedPaths: ['/admin/pricing/service-location', '/admin/pricing/zone', '/admin/pricing/set-price', '/admin/pricing/vehicle-type'],
  },
  {
    id: 'geofencing',
    path: '/admin/geo',
    match: (pathname) => pathname.startsWith('/admin/geo'),
    title: 'Geofencing, Heat Maps & God’s Eye',
    category: 'Geofencing',
    summary: 'Live spatial analytics, driver heatmaps, real-time fleet map overview, and automated peak demand zones.',
    overview: 'Visual spatial intelligence console. "God’s Eye" shows all active and free drivers moving on a live map. "Heat Map" visualizes passenger search density to help position drivers in high-demand areas.',
    keyActions: [
      { title: "God's Eye Live Fleet Map", desc: 'Watch real-time vehicle GPS movements, categorized by Available, On Trip, or Offline.' },
      { title: 'Passenger Demand Heat Map', desc: 'Identify hotspots where passenger app openings and search requests are peaking.' },
      { title: 'Peak Zones & Dynamic Surge', desc: 'Define automated surge pricing zones (e.g. 1.2x, 1.5x) during rush hours or rain.' },
    ],
    steps: [
      { step: 1, title: 'Open God’s Eye', desc: 'Select city and zoom into active driver clusters.' },
      { step: 2, title: 'Analyze Heatmap', desc: 'Check if high-demand areas have sufficient driver coverage.' },
      { step: 3, title: 'Activate Peak Surge', desc: 'Enable surge multiplier to balance supply and demand.' },
    ],
    tips: [
      'Drivers are automatically alerted on their apps when peak surge multipliers activate in nearby zones.',
    ],
    relatedPaths: ['/admin/geo/heatmap', '/admin/geo/gods-eye', '/admin/pricing/zone'],
  },

  // ===================== PROMOTIONS & MARKETING =====================
  {
    id: 'promotions',
    path: '/admin/promotions',
    match: (pathname) => pathname.startsWith('/admin/promotions'),
    title: 'Promotions, Promo Codes & Push Notifications',
    category: 'Marketing & Promotions',
    summary: 'Drive customer retention with coupon codes, promotional banners, explore recommendations, and mass push notifications.',
    overview: 'Create promotional campaigns to boost booking volume. Generate coupon codes (Percentage or Flat discounts), broadcast rich push notifications with deep-links, and manage app banner advertisements.',
    keyActions: [
      { title: 'Promo Code Generator', desc: 'Create coupons with maximum discount caps, minimum order value, usage limits, and expiry dates.' },
      { title: 'Push Notification Broadcast', desc: 'Send rich notifications with custom images and titles to All Users, Inactive Riders, or Drivers.' },
      { title: 'Banner Management', desc: 'Upload promotional slider banners displayed on the customer app home screen.' },
      { title: 'Explore India Tourism', desc: 'Curate spiritual trips, tourist packages, and famous city destinations for one-click bookings.' },
    ],
    steps: [
      { step: 1, title: 'Create Coupon', desc: 'Click "Add Promo Code", specify code name (e.g. FESTIVE50), discount %, and max limit.' },
      { step: 2, title: 'Send Push Notification', desc: 'Compose message title, upload graphic banner, select audience, and click Broadcast.' },
      { step: 3, title: 'Track Usage', desc: 'Monitor redemption counts and revenue uplift from promotional campaigns.' },
    ],
    tips: [
      'Target inactive users who haven’t booked in 14 days with special discount promo codes to boost re-engagement.',
    ],
    relatedPaths: ['/admin/promotions/promo-codes', '/admin/promotions/send-notification', '/admin/promotions/banner-image'],
  },

  // ===================== REFERRALS =====================
  {
    id: 'referrals',
    path: '/admin/referrals',
    match: (pathname) => pathname.startsWith('/admin/referrals'),
    title: 'Referral Program & Viral Growth',
    category: 'Growth & Referrals',
    summary: 'Configure dual-sided referral reward bonuses for passengers and drivers inviting friends and colleagues.',
    overview: 'Manage viral growth settings. Set referral bonuses for the referrer and referee (e.g. ₹50 wallet cash after referee completes their 1st ride), configure terms, and track referral fraud.',
    keyActions: [
      { title: 'Referral Dashboard', desc: 'Track total invitations sent, conversion rates, and total bonus payouts disbursed.' },
      { title: 'User Referral Rules', desc: 'Set reward amounts and qualification rules (e.g. bonus triggers only after 1st successful ride).' },
      { title: 'Driver Referral Rules', desc: 'Incentivize drivers for recruiting fellow licensed drivers with milestone bonuses.' },
    ],
    steps: [
      { step: 1, title: 'Set Reward Amount', desc: 'Define bonus credited to referrer and bonus given to new user.' },
      { step: 2, title: 'Configure Qualification Condition', desc: 'Choose whether bonus credits instantly or upon completing first trip.' },
      { step: 3, title: 'Audit Referral Claims', desc: 'Inspect referral trees to prevent self-referral and duplicate device fraud.' },
    ],
    tips: [
      'Dual-sided rewards (rewarding both the sender and receiver) yield the highest viral conversion rate.',
    ],
    relatedPaths: ['/admin/users', '/admin/drivers'],
  },

  // ===================== OWNER & FLEET MANAGEMENT =====================
  {
    id: 'owner-management',
    path: '/admin/owners',
    match: (pathname) => pathname.startsWith('/admin/owners') || pathname.startsWith('/admin/fleet'),
    title: 'Fleet Owners & Vehicle Consoles',
    category: 'Fleet & Owners',
    summary: 'Manage fleet companies, vehicle aggregators, multi-car owners, fleet drivers, and commission payouts.',
    overview: 'Fleet owners manage multiple commercial vehicles and employ drivers under their agency. This console enables tracking fleet earnings, driver assignments, vehicle maintenance documents, and owner withdrawals.',
    keyActions: [
      { title: 'Owner Verification', desc: 'Approve fleet operators, GST certificates, and commercial transport licenses.' },
      { title: 'Fleet Driver Allocation', desc: 'Assign and swap approved drivers between different vehicles in the fleet.' },
      { title: 'Owner Earnings & Wallet', desc: 'Track revenue generated across all vehicles owned by a fleet company.' },
      { title: 'Owner Bookings Feed', desc: 'Filter bookings serviced specifically by fleet-managed vehicles.' },
    ],
    steps: [
      { step: 1, title: 'Onboard Fleet Owner', desc: 'Verify business credentials and approve company account.' },
      { step: 2, title: 'Register Fleet Vehicles', desc: 'Add commercial cars/buses and attach required permits.' },
      { step: 3, title: 'Assign Drivers', desc: 'Link verified drivers to specific vehicle number plates.' },
    ],
    tips: [
      'Fleet owners can log into their dedicated Owner Console using the top workspace switcher.',
    ],
    relatedPaths: ['/admin/fleet/drivers', '/admin/fleet/manage', '/admin/owners/bookings'],
  },

  // ===================== REPORTS & BUSINESS INTELLIGENCE =====================
  {
    id: 'reports',
    path: '/admin/reports',
    match: (pathname) => pathname.startsWith('/admin/reports'),
    title: 'Reports & Business Intelligence',
    category: 'Reports & Analytics',
    summary: 'Generate and export deep-dive audit reports for users, drivers, duty shifts, fleet finances, and tax records.',
    overview: 'Comprehensive reporting suite for accounting, operational audits, and management review. Export detailed datasets with custom date ranges, filters, and formats.',
    keyActions: [
      { title: 'Driver Duty Reports', desc: 'Inspect driver work hours, login/logout logs, break times, and acceptance rates.' },
      { title: 'Financial & Tax Reports', desc: 'Audit total fare collections, GST/tax liabilities, gateway fees, and net margins.' },
      { title: 'User Booking Trends', desc: 'Analyze repeat customer retention, cancellation frequency, and top spending routes.' },
      { title: 'CSV & Excel Export', desc: 'One-click export of structured reports for accountants and business analysts.' },
    ],
    steps: [
      { step: 1, title: 'Choose Report Type', desc: 'Select User, Driver, Duty, Finance, or Fleet Report.' },
      { step: 2, title: 'Apply Date & City Filters', desc: 'Narrow down data to specific months, years, or operational zones.' },
      { step: 3, title: 'Export & Analyze', desc: 'Download CSV file or review interactive data tables directly.' },
    ],
    tips: [
      'Run financial reconciliation reports at the end of each billing cycle to match payment gateway settlements.',
    ],
    relatedPaths: ['/admin/earnings', '/admin/trips', '/admin/drivers'],
  },

  // ===================== SUPPORT & DISPUTE TICKETS =====================
  {
    id: 'support-management',
    path: '/admin/support',
    match: (pathname) => pathname.startsWith('/admin/support'),
    title: 'Support Tickets & Helpdesk',
    category: 'Support Management',
    summary: 'Manage customer complaints, lost items, fare disputes, driver misconduct reports, and support categories.',
    overview: 'Helpdesk ticketing center to ensure customer issues are resolved systematically. Customers and drivers submit tickets with screenshots and ride references for admin review and resolution.',
    keyActions: [
      { title: 'Ticket Queues', desc: 'Filter tickets by Status (Open, In Progress, Resolved, Closed) and Priority (Urgent, High, Normal).' },
      { title: 'Ticket Titles & Categories', desc: 'Configure standard issue topics (e.g. "Charged Incorrect Amount", "Driver was Rude", "Lost Item in Vehicle").' },
      { title: 'Internal Notes & Resolution', desc: 'Add staff notes, trigger customer refunds, and close resolved support tickets.' },
    ],
    steps: [
      { step: 1, title: 'Open Urgent Tickets', desc: 'Inspect high-priority tickets first.' },
      { step: 2, title: 'Investigate Linked Ride', desc: 'Review the attached trip ID, driver comments, and GPS route.' },
      { step: 3, title: 'Reply & Resolve', desc: 'Send resolution message to user and update ticket status to Resolved.' },
    ],
    tips: [
      'Resolving tickets within 2 hours drastically increases customer satisfaction scores.',
    ],
    relatedPaths: ['/admin/chat', '/admin/trips', '/admin/users'],
  },

  // ===================== SETTINGS & CONFIGURATIONS =====================
  {
    id: 'business-settings',
    path: '/admin/settings/business',
    match: (pathname) => pathname.startsWith('/admin/settings/business'),
    title: 'Business & Operation Settings',
    category: 'System Settings',
    summary: 'Configure core business rules, app branding, vehicle dispatch algorithms, transport modes, and bid ride settings.',
    overview: 'Configure high-level platform behavior. Set company contact information, primary currency, operational radius, driver search timeouts, bidding ride parameters, and automated dispatch logic.',
    keyActions: [
      { title: 'General Settings', desc: 'Set Platform Name, Contact Email, Support Hotline, Currency, and Timezone.' },
      { title: 'Theme & Customization', desc: 'Update Admin panel primary color, dark/light sidebar themes, and logo assets.' },
      { title: 'Transport Ride Settings', desc: 'Configure driver search radius (km), driver acceptance timer (seconds), and max dispatch retries.' },
      { title: 'Bid Ride Settings', desc: 'Enable or disable interactive driver-rider fare bidding and negotiation intervals.' },
    ],
    steps: [
      { step: 1, title: 'Review General Info', desc: 'Ensure accurate support email, app name, and default currency.' },
      { step: 2, title: 'Tune Dispatch Parameters', desc: 'Adjust driver search radius and response timeout to match city traffic density.' },
      { step: 3, title: 'Save Settings', desc: 'Changes take effect across apps and APIs immediately upon saving.' },
    ],
    tips: [
      'In high-density cities, reduce driver search radius to 3-5 km for faster driver arrivals.',
    ],
    relatedPaths: ['/admin/settings/app', '/admin/settings/third-party', '/admin/settings/cms'],
  },
  {
    id: 'app-settings',
    path: '/admin/settings/app',
    match: (pathname) => pathname.startsWith('/admin/settings/app'),
    title: 'Mobile App Settings & Feature Flags',
    category: 'System Settings',
    summary: 'Manage in-app wallet thresholds, driver tipping options, and mobile onboarding walkthrough screens.',
    overview: 'Tailor the passenger and driver mobile app user experience. Configure minimum wallet top-up amounts, preset tip suggestions (₹10, ₹20, ₹50), and customize introductory splash screens.',
    keyActions: [
      { title: 'Wallet Settings', desc: 'Set minimum wallet balance required to request a ride and maximum wallet balance limit.' },
      { title: 'Tip Settings', desc: 'Enable optional tipping at ride completion with configurable preset amounts.' },
      { title: 'Onboarding Screens', desc: 'Upload illustrations and titles for the 3-step app introductory walkthrough.' },
    ],
    steps: [
      { step: 1, title: 'Configure Wallet Rules', desc: 'Set minimum balance rules to prevent unpaid rides.' },
      { step: 2, title: 'Enable Tips', desc: 'Turn on driver tips to incentivize high driver ratings.' },
      { step: 3, title: 'Save', desc: 'Mobile apps will dynamically refresh settings on their next launch.' },
    ],
    tips: [
      'Enabling tipping significantly boosts driver morale without impacting platform margins.',
    ],
    relatedPaths: ['/admin/settings/business', '/admin/wallet/payment'],
  },
  {
    id: 'third-party-settings',
    path: '/admin/settings/third-party',
    match: (pathname) => pathname.startsWith('/admin/settings/third-party'),
    title: 'Third-Party Gateways & API Keys',
    category: 'System Settings',
    summary: 'Manage secure API credentials for Payment Gateways (Razorpay, Stripe, PhonePe), SMS OTPs, Firebase, Google Maps, and Mail.',
    overview: 'Technical integration hub. Enter and test API keys for Google Maps Navigation, SMS OTP verification providers, Firebase Push Notifications, and Payment Gateways. Credentials are stored securely.',
    keyActions: [
      { title: 'Payment Gateways', desc: 'Configure Razorpay, Stripe, PhonePe, or Paystack API keys and webhooks.' },
      { title: 'SMS Gateway Settings', desc: 'Connect Twilio, MSG91, or Fast2SMS for high-speed OTP delivery.' },
      { title: 'Firebase Cloud Messaging', desc: 'Upload Firebase service account JSON for reliable background push notifications.' },
      { title: 'Google Maps API Keys', desc: 'Configure Maps JavaScript, Places Autocomplete, Geocoding, and Directions API keys.' },
      { title: 'SMTP Mail Configuration', desc: 'Setup outgoing email server for customer invoices and password resets.' },
    ],
    steps: [
      { step: 1, title: 'Select Integration Tab', desc: 'Choose Payment, SMS, Firebase, Maps, or Mail.' },
      { step: 2, title: 'Enter API Keys & Webhook Secrets', desc: 'Paste production or sandbox credentials provided by your third-party vendor.' },
      { step: 3, title: 'Test Connection & Save', desc: 'Ensure keys have required permissions before switching from Sandbox to Live mode.' },
    ],
    tips: [
      'Restrict your Google Maps API key in Google Cloud Console to prevent unauthorized usage quotas.',
    ],
    relatedPaths: ['/admin/settings/business', '/admin/earnings'],
  },
  {
    id: 'cms-settings',
    path: '/admin/settings/cms',
    match: (pathname) => pathname.startsWith('/admin/settings/cms'),
    title: 'CMS & Landing Website Builder',
    category: 'System Settings',
    summary: 'Customize the public landing homepage, header/footer links, driver recruitment page, and legal policy pages.',
    overview: 'Manage content displayed on your platform’s public customer website. Update marketing hero banners, app download links, about us stories, contact details, Privacy Policy, Terms & Conditions, and DMV regulations.',
    keyActions: [
      { title: 'Header & Footer Navigation', desc: 'Manage top menu links, logo, social media icons, and copyright text.' },
      { title: 'Homepage Hero & Sections', desc: 'Edit headline text, marketing call-to-actions, and app store badges.' },
      { title: 'Legal & Privacy Policy', desc: 'Maintain up-to-date legal terms, refund policies, and driver partner agreements.' },
      { title: 'Driver Landing Page', desc: 'Showcase earnings potential and vehicle benefits to recruit new drivers.' },
    ],
    steps: [
      { step: 1, title: 'Select Page Section', desc: 'Choose Home, About Us, Driver, User, Contact, or Legal.' },
      { step: 2, title: 'Edit Content & Media', desc: 'Update text, upload banner illustrations, and adjust headings.' },
      { step: 3, title: 'Save & Publish', desc: 'Website updates go live immediately without requiring code rebuilds.' },
    ],
    tips: [
      'Keep your Privacy Policy and Terms of Service updated for App Store & Play Store compliance.',
    ],
    relatedPaths: ['/admin/settings/business', '/admin/promotions/banner-image'],
  },
  {
    id: 'admin-management',
    path: '/admin/management/admins',
    match: (pathname) => pathname.startsWith('/admin/management'),
    title: 'Sub-Admins & Role Permissions',
    category: 'Admin Security',
    summary: 'Create staff accounts, dispatchers, accountants, and configure granular role-based access control (RBAC).',
    overview: 'Manage internal administrative access. Create sub-admin accounts for customer support reps, dispatchers, or regional managers with strictly scoped permissions (e.g. only view rides, or only manage support chats).',
    keyActions: [
      { title: 'Create Sub-Admin', desc: 'Generate login credentials for staff members with assigned department roles.' },
      { title: 'Granular Permissions', desc: 'Toggle specific privileges: View Only, Edit Pricing, Approve Drivers, or Access Financials.' },
      { title: 'Activity Audit Log', desc: 'Track administrative logins and sensitive changes made by staff members.' },
    ],
    steps: [
      { step: 1, title: 'Click "Add Admin"', desc: 'Enter staff name, official email, and secure password.' },
      { step: 2, title: 'Assign Permissions', desc: 'Check only the modules this staff member is authorized to manage.' },
      { step: 3, title: 'Activate Account', desc: 'Staff can now log in with restricted access matching their assigned role.' },
    ],
    tips: [
      'Always follow the principle of least privilege—only grant permissions required for the staff member’s job duties.',
    ],
    relatedPaths: ['/admin/dashboard', '/admin/profile'],
  },
  {
    id: 'language-masters',
    path: '/admin/masters/languages',
    match: (pathname) => pathname.startsWith('/admin/masters'),
    title: 'Language & Localization Masters',
    category: 'Masters',
    summary: 'Manage multi-language translations, default platform languages, and regional text strings.',
    overview: 'Enable global and regional accessibility. Configure platform languages (English, Hindi, Spanish, French, Arabic, etc.), set text direction (LTR / RTL), and customize translation strings across rider and driver apps.',
    keyActions: [
      { title: 'Active Languages', desc: 'Enable or disable supported languages across all apps.' },
      { title: 'Default Language', desc: 'Set fallback system language for new app installations.' },
      { title: 'Translation Keys', desc: 'Review and update localization strings for buttons, alerts, and notifications.' },
    ],
    steps: [
      { step: 1, title: 'Add Language', desc: 'Select language code (e.g. "hi" for Hindi, "en" for English).' },
      { step: 2, title: 'Set Default', desc: 'Select primary language for your primary market.' },
      { step: 3, title: 'Save', desc: 'Users can select their preferred language in the app settings.' },
    ],
    tips: [
      'Supporting local regional languages increases adoption among non-English speaking drivers.',
    ],
    relatedPaths: ['/admin/settings/business'],
  },
];

/**
 * Helper to find the best matching guide for any current route pathname.
 */
export const findGuideForPath = (pathname = '') => {
  const cleanPath = pathname.toLowerCase().split('?')[0];

  // 1. Exact or custom matcher match
  const matched = PAGE_GUIDES.find((g) => {
    if (typeof g.match === 'function') {
      return g.match(cleanPath);
    }
    return g.path && (cleanPath === g.path || cleanPath.startsWith(`${g.path}/`));
  });

  if (matched) return matched;

  // 2. Generic fallback guide
  return {
    id: 'general-guide',
    path: cleanPath,
    title: 'Admin Operations Guide',
    category: 'System Hub',
    summary: 'Comprehensive administration console for managing your transport, delivery, and rental operations.',
    overview: 'This section allows authorized administrators to manage data, review real-time activity, configure rules, and verify platform records. Use the search bar in this guide to explore detailed manuals for any specific page.',
    keyActions: [
      { title: 'Search & Filters', desc: 'Use filters and search bars to find specific records quickly.' },
      { title: 'Export & Actions', desc: 'Take operational actions, edit profiles, or export reports for auditing.' },
      { title: 'Status Management', desc: 'Toggle active/inactive states to keep platform operations running smoothly.' },
    ],
    steps: [
      { step: 1, title: 'Inspect Records', desc: 'Review current listings and verify incoming data.' },
      { step: 2, title: 'Perform Actions', desc: 'Use table action buttons to edit, approve, or update records.' },
      { step: 3, title: 'Save Changes', desc: 'Ensure all modifications are saved and verified.' },
    ],
    tips: [
      'Use the search box above in this guide to read instructions for any other admin screen.',
    ],
    relatedPaths: ['/admin/dashboard', '/admin/trips', '/admin/drivers'],
  };
};

