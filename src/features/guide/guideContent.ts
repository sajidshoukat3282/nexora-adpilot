/**
 * All in-app help text lives here, so it is easy to edit or extend.
 * Each page has a list of topics; each topic is a short set of steps that use
 * the real button and tab names from the app.
 */

export interface GuideTopic {
  title: string;
  steps: string[];
  tip?: string;
}

export interface PageGuide {
  /** route prefix, e.g. "/finance" */
  path: string;
  title: string;
  summary: string;
  topics: GuideTopic[];
}

export const PAGE_GUIDES: PageGuide[] = [
  {
    path: "/dashboard",
    title: "Dashboard",
    summary: "Your command center: revenue, expenses, live campaigns and business health at a glance.",
    topics: [
      {
        title: "Weather widget",
        steps: [
          "The gold and silver weather card shows the weather for the area where most of your screens are. If you have screens in several cities, click a city tab to switch.",
          "If a screen has no location, add its latitude and longitude in Inventory. Without any screen, your city in Company Profile is used.",
          "Warnings (rain, storm, extreme heat, strong wind, fog) appear under the card for screens of campaigns running today. Click the campaign name to see details.",
        ],
      },
      {
        title: "Read your key numbers",
        steps: [
          "The top cards show Total Revenue, Total Expenses, Live Campaigns and Overall ROAS.",
          "Business Health Score summarizes how the company is doing overall.",
          "Budget-to-Revenue Flow shows how campaign budgets turn into revenue.",
        ],
        tip: "Numbers fill in as you add campaigns, invoices, payments and expenses.",
      },
      {
        title: "Check inventory and top campaigns",
        steps: [
          "OOH vs DOOH Inventory splits your static and digital screens, with the Online count.",
          "Top Performing Campaigns lists the campaigns with the best results, with status and type.",
          "Use the left menu to open any module for details.",
        ],
      },
    ],
  },
  {
    path: "/inventory",
    title: "Inventory & Media Map",
    summary: "All your billboards and digital screens, with real availability by date.",
    topics: [
      {
        title: "Add a screen or billboard",
        steps: [
          "Click Add Screen.",
          "Choose Digital or Static at the top of the form.",
          "Fill in the name, city, location, size and daily rate. Use Search Location or enter Latitude and Longitude so it appears on the map (and so field proof photos can be checked against the screen's location).",
          "Digital: add resolution, orientation, ad length, advertisers per loop, run hours, player and network.",
          "Static: add faces, lighting, facing direction, and permit number and expiry.",
          "Optionally add the owner, rent and contract end date, then click Save.",
        ],
        tip: "You get a warning when a permit or contract is about to expire.",
      },
      {
        title: "Edit or delete a screen",
        steps: [
          "Click an asset, then Edit in the drawer.",
          "Change any field and save, or use Delete.",
        ],
        tip: "A screen used in a campaign cannot be deleted. Set it to Offline instead.",
      },
      {
        title: "Find and filter inventory",
        steps: [
          "Use the filters: All Categories, All Media Types and All Statuses.",
          "The table shows Asset, Category, city, Rate/day and Status.",
          "Click an asset to open its detail drawer.",
        ],
      },
      {
        title: "Check availability and book",
        steps: [
          "Open an asset and use Check Availability with your From and To dates.",
          "If it is free, use Add to Campaign to attach it to a campaign.",
        ],
        tip: "Digital screens are booked by slots. Advertisers per loop is the number of slots; the check shows how many are free for your dates.",
      },
    ],
  },
  {
    path: "/campaigns",
    title: "Campaigns",
    summary: "Plan, book, run and bill advertising campaigns.",
    topics: [
      {
        title: "Check the weather of a campaign",
        steps: [
          "Open a campaign and click the Weather tab.",
          "Each screen shows its own weather and 3 day forecast from its own location, so a screen in one area can be sunny while another gets rain.",
          "Screens without latitude and longitude are listed with a note. Add the location in Inventory.",
          "The data is a forecast and refreshes about every 30 minutes. Very small local showers may not appear.",
        ],
      },
      {
        title: "Create a campaign",
        steps: [
          "Click New Campaign.",
          "Enter Campaign Name, Client, Brand, Objective, Start Date, End Date, Currency and Total Budget.",
          "Save it. The campaign appears in the list with its status and schedule.",
        ],
        tip: "Add the client first in CRM & Leads so you can pick them here.",
      },
      {
        title: "Work inside a campaign",
        steps: [
          "Click a campaign to open its workspace.",
          "Overview: days left, progress, invoiced, received, outstanding and alerts.",
          "Screens: add or remove screens. For a digital screen with several advertiser slots, choose how many slots this campaign takes. Overbooking is blocked.",
          "Schedule: timeline of the campaign period.",
          "Billing: invoices of this campaign. Use Create invoice to prefill the client and screens.",
          "Expenses: click + Add Expense to record a cost for this campaign (printing, installation, media owner payment). It is linked to the campaign and counts in its profit. Activity shows the change history.",
          "Creatives: add artwork by clicking Upload from computer (PNG, JPG, GIF, WEBP, PDF, MP4 or WEBM, up to 25 MB) or by pasting a Drive/Dropbox link for bigger files. Changing the file or link creates a new version. Proof of play photos can be uploaded the same way.",
          "Approvals: send a creative for internal review, then to the client, then Approved or Rejected (with a reason). Every step is logged.",
          "Delivery: screen condition and proof count per screen. Proof of Play: add a site photo link or note per screen and date.",
          "Analytics: revenue per day and per screen-day, collection %, margin and value by screen, from your own bookings and invoices.",
        ],
        tip: "Profit so far = money received minus the campaign's expenses.",
      },
      {
        title: "Change status, renew, share",
        steps: [
          "Use the buttons at the top: Confirm booking, Go live, Mark completed or Cancel. Only valid next steps are shown.",
          "Renew creates a new draft with the same client and screens for new dates.",
          "Client summary opens a printable page. Use Print / Save PDF or Share on WhatsApp.",
          "Only draft campaigns without invoices can be deleted.",
        ],
      },
      {
        title: "Campaign list and calendar",
        steps: [
          "Cards show Live, Booked, Ending soon and Total value.",
          "Filter by status, search, or Export CSV.",
          "Switch to Calendar to see all campaigns on a timeline.",
        ],
      },
    ],
  },
  {
    path: "/operations",
    title: "Live Operations",
    summary: "See what runs on each screen today, follow up issues and keep proof of play.",
    topics: [
      {
        title: "Weather warnings",
        steps: [
          "Open the Alerts tab. Weather warnings for screens of campaigns running today appear at the top.",
          "Click the campaign name on a warning to open its Weather tab.",
        ],
      },
      {
        title: "Today Board",
        steps: [
          "Each card is one of your screens with its status (Online, Maintenance or Offline) and the campaigns booked on it today.",
          "Use the search, status and city filters to find a screen quickly.",
          "Click a screen to change its status, create a player link, see its bookings, issues, maintenance and proof photos.",
        ],
        tip: "Status is manual unless you create a player link for the screen. Maintenance always stays manual.",
      },
      {
        title: "Screen player (play ads on a screen)",
        steps: [
          "Open a screen and click Create player link. Copy the link, it is shown only once.",
          "Open that link in the browser of the screen's TV box, Android box or PC, and press Fullscreen. The page plays the approved creatives of campaigns running on that screen today, in a loop.",
          "For a quick trial, open the link on any phone or computer and press Open player.",
          "The page saves the files on the device, so it keeps playing if the internet drops, and it checks for changes every 5 minutes.",
          "The screen shows Online while the player is open. It shows Offline after 10 minutes of silence. Use Remove link to go back to manual status.",
        ],
        tip: "A creative plays only if it is Approved and is an uploaded image or video file (or a direct image or video link). Google Drive and YouTube links cannot be played. More slots on a screen means the creative repeats more often.",
      },
      {
        title: "Alerts",
        steps: [
          "Alerts are worked out from your real data: a booked screen that is offline or in maintenance, a running campaign without an approved creative, campaigns ending soon, and no recent proof.",
          "Use the buttons on each alert to open the screen or the campaign.",
        ],
      },
      {
        title: "Incidents",
        steps: [
          "Click Report an issue, add a title, priority, screen or campaign and an owner.",
          "Use Start work and Resolve (write how it was fixed). High priority issues also send a notification.",
        ],
      },
      {
        title: "Field proof from a phone",
        steps: [
          "In Admin & Roles invite your field person with the Field Operator role (or give only the Submit Proof permission). After login they land straight on the Field Proof page.",
          "The page lists the screens with a campaign running today. They tap Take photo, the phone camera opens, and the photo is sent with the phone location.",
          "If the photo is taken within 500 m of the screen the proof is marked Location verified. The client sees it in the portal and gets a notification.",
        ],
        tip: "Ask the field person to allow location when the phone asks. Add the screen's latitude and longitude in Inventory so the distance can be checked.",
      },
      {
        title: "Field team: assignments and coverage",
        steps: [
          "Open the Field Team tab. Click Assign screens next to a person and choose cities or single screens. Their Field page then lists only those screens. If nothing is chosen they see all screens.",
          "Each person shows how many proofs they sent today and when the last one came. The Proof of Play tab shows who took each photo.",
          "The No proof yet today list shows screens still waiting for a photo and who is assigned.",
          "Set a Daily reminder time. After that time you get a notification if screens still have no proof. It appears when someone opens Live Operations or the Field page.",
        ],
      },
      {
        title: "Proof of Play",
        steps: [
          "Click Add proof, choose the campaign and screen, then upload a photo or paste a video link.",
          "Photos are made smaller automatically before upload. Proof also appears on the campaign page.",
        ],
      },
      {
        title: "Maintenance and Upcoming",
        steps: [
          "Schedule maintenance with a screen, date and work to do. Mark it done when finished. Overdue items are flagged.",
          "The Upcoming tab shows campaigns starting or ending in the next 7 days and whether their creative is approved.",
        ],
      },
    ],
  },
  {
    path: "/reports",
    title: "Analytics & Reports",
    summary: "Business analytics and branded reports: performance, profit and loss, receivables, client statements, campaigns, inventory and sales.",
    topics: [
      {
        title: "Choose a period",
        steps: [
          "Pick a quick period (This month, Last month, This quarter, This year, Last year, Last 30 days) or set your own From and To dates.",
          "Every number and chart on the page follows this period. Cards show the change versus the previous period of the same length.",
        ],
      },
      {
        title: "Reports in this page",
        steps: [
          "Overview: key cards, 12-month trend, top clients, top screens, receivables by age and plain-language key points.",
          "Profit & Loss: revenue collected less expenses by category, with margin.",
          "Receivables: what clients owe, grouped by how late it is, with the list of open invoices.",
          "Client Statement: choose a client to see billed, received and the running balance.",
          "Campaigns: contract, received, expenses and profit for each campaign.",
          "Inventory: how much of each screen's slots were sold. Sales & CRM: lead stages and campaign mix.",
        ],
      },
      {
        title: "Print, PDF and Excel",
        steps: [
          "Click Preview to see the branded report with cover page and your company letterhead.",
          "Click Print / PDF to print it or save it as a PDF. Click Export Excel for a real .xlsx file with one sheet per table.",
          "Click Save view to keep the current report and period as a shortcut under Saved views.",
        ],
        tip: "Your company details come from Admin & Roles. Fill them in so reports look complete.",
      },
      {
        title: "Weekly email digest",
        steps: [
          "Open Email & Schedule. Choose the day and add any extra email addresses, then Save schedule.",
          "Check the preview. Use Send a test to me to see it in your inbox, or Send now to everyone.",
          "The history table shows every digest that was sent.",
        ],
      },
    ],
  },
  {
    path: "/crm",
    title: "CRM & Leads",
    summary: "Track prospects through your pipeline and manage client relationships.",
    topics: [
      {
        title: "Add leads and move them through the pipeline",
        steps: [
          "Click Add Lead and enter the company, contact, phone, email, source and estimated value.",
          "The Pipeline tab shows columns: Lead, Qualified, Proposal, Negotiation, Won and Lost.",
          "On a lead card use Move stage to progress it.",
          "When a lead is Won, click Convert to Client.",
        ],
      },
      {
        title: "Follow up with leads and clients",
        steps: [
          "Open a lead with Log / Follow-up to record a call, meeting or note and set the next follow-up date.",
          "Today's Focus at the top lists overdue and due follow-ups.",
          "Use the call, WhatsApp and email icons on a card to reach out quickly.",
        ],
      },
      {
        title: "Manage clients",
        steps: [
          "Click Add Client, or open the Clients tab to see all clients with outstanding and overdue amounts.",
          "Click a client to open the full client view: timeline, contacts, activity and finance.",
          "Click Invite to Portal in the client row to give the client access to the Client Portal.",
          "Use Export CSV to download the list.",
        ],
      },
      {
        title: "Insights tab",
        steps: [
          "Pipeline Forecast shows the weighted value of open deals.",
          "Renewal Radar lists campaigns ending soon, with a one-click WhatsApp renewal offer.",
          "Lead Source Performance and Top Clients by Revenue show what works best.",
        ],
      },
    ],
  },
  {
    path: "/proposals",
    title: "Proposals",
    summary: "Quote clients, send branded proposals, track the pipeline and turn accepted deals into campaigns.",
    topics: [
      {
        title: "Create a proposal",
        steps: [
          "Click + New Proposal, or open a client in CRM and click Create Proposal.",
          "Choose the Client, enter the Campaign name and the Start and End dates.",
          "Tick the screens you want. For each screen set the Slots and the Rate. Digital screens show their slot capacity and a warning appears if there are not enough free slots.",
          "Set Discount %, Tax %, Valid until, Terms and Notes. The total updates live in your company currency.",
          "Click Save Draft. The proposal gets an automatic code such as PRO-0001.",
        ],
      },
      {
        title: "Send and close",
        steps: [
          "Open a proposal to see the client document. Use Print / PDF, Share on WhatsApp or Share by email.",
          "Click Mark as sent when you send it. Then click Client accepted or Client rejected when you hear back.",
          "Sent proposals past their Valid until date become Expired. Sent proposals with no reply for 5 days show a follow-up reminder.",
          "Use Revise to make a new draft copy, for example after a price change.",
        ],
      },
      {
        title: "Convert to a campaign",
        steps: [
          "Open an Accepted proposal and click Convert to Campaign.",
          "A draft campaign is created with the client, dates, screens and slots filled in. If slots are no longer free you will be warned and can choose Convert anyway.",
          "The proposal then shows a link to its campaign.",
        ],
      },
      {
        title: "Read the pipeline",
        steps: [
          "The top cards show Open pipeline, Accepted value, Win rate and Expiring soon.",
          "Use the status filters, search and Export CSV to review your proposals.",
        ],
      },
    ],
  },
  {
    path: "/finance",
    title: "Finance & Accounts",
    summary: "Invoices, payments, expenses, ledgers and cash-flow insights.",
    topics: [
      {
        title: "Create and send an invoice",
        steps: [
          "Click Create Invoice and choose the client.",
          "Add line items with + Add Item. Tax and totals are calculated.",
          "Click Save Invoice. It appears in the Invoices tab.",
          "Open the invoice to share it by WhatsApp or Email, or to Send Reminder.",
        ],
        tip: "Bank details and the QR code on invoices come from your company profile in Admin & Roles.",
      },
      {
        title: "Receive a payment",
        steps: [
          "Click Receive Payment (or Record Payment inside an invoice).",
          "Select the unpaid invoice, then enter Amount Received, Date, Payment Method, Received By and an optional Reference No.",
          "Click Save Payment.",
          "The invoice becomes Paid, or partially paid, and the client ledger updates.",
        ],
      },
      {
        title: "Record an expense",
        steps: [
          "Click Add Expense.",
          "Pick the category, enter the amount and date, then Save Expense.",
          "Expenses feed the Profit & Loss tab and the Dashboard.",
        ],
      },
      {
        title: "Tabs",
        steps: [
          "Profit & Loss: income versus expenses.",
          "Invoices, Payments and Expenses: full lists you can open for details.",
          "Client Ledger: everything one client has been billed and has paid.",
          "Insights: cash flow, invoice ageing and profit by campaign.",
          "Payables, Accounts and Tax & Export: see the topics below.",
        ],
      },
      {
        title: "Pay suppliers (Payables)",
        steps: [
          "Open the Payables tab and click Add Vendor to save a supplier (media owner, printer, etc.).",
          "Click Add Bill, choose the vendor, enter the bill date, due date, amount and tax, then Save Bill.",
          "When you pay, click Pay on the bill. Enter the amount (part payments are fine) and choose the account it was paid from.",
          "Total payable, Overdue and Due in 7 days are shown at the top.",
        ],
        tip: "Use the filter above the table to see Open, Overdue or Paid bills.",
      },
      {
        title: "Track cash and bank (Accounts)",
        steps: [
          "Open the Accounts tab and click Add Account for each cash box, bank account or wallet, with its opening balance.",
          "Use Money In and Money Out on an account to record other movements.",
          "Bill payments that you link to an account are recorded automatically.",
        ],
      },
      {
        title: "Tax summary and accounting export (Tax & Export)",
        steps: [
          "Open the Tax & Export tab and choose a period (this month, quarter, year or custom).",
          "The table shows sales, output tax, purchases, input tax and the net tax payable.",
          "Download invoices for Xero or QuickBooks, or CSV files of payments, expenses, bills and the tax summary, to give to your accountant.",
        ],
        tip: "Always confirm tax rules and filing with your accountant.",
      },
      {
        title: "Payment reminders",
        steps: [
          "Open an overdue invoice and click Send Reminder to email the client now.",
          "Automatic reminders can be enabled by your administrator.",
        ],
      },
    ],
  },
  {
    path: "/clients/credit-risk",
    title: "Credit Risk",
    summary: "Control how much each client can owe, spot late payers early and stop over-booking.",
    topics: [
      {
        title: "Read the page",
        steps: [
          "The top cards show Total credit limit, Total exposure, Overdue and Clients at risk.",
          "Exposure means unpaid invoices plus accepted proposals not yet booked plus booked or live campaigns not yet invoiced.",
          "Each client has a Risk score from 0 to 100 and a level: Low, Watch, High or Critical. The score uses limit usage, how late overdue invoices are, and payment history.",
          "Use the filters, search, sort and Export CSV to review clients.",
        ],
      },
      {
        title: "Open a client",
        steps: [
          "Click a client to see the reasons for the score, exposure breakdown, ageing (Current, 1-30, 31-60, 61-90, 90+ days), on-time payment rate, average delay and open invoices.",
          "Click Edit limit to change the credit limit. You can add a reason, or use the suggested limit. Every change is saved in Limit history.",
          "Use WhatsApp reminder or Email reminder to chase overdue payments.",
        ],
      },
      {
        title: "Limits are enforced",
        steps: [
          "A client over the limit, or on a booking hold, cannot get a new campaign or a converted proposal.",
          "Users with finance access can click Approve exception. It is recorded in Limit history.",
          "Click Hold new bookings on a client to stop all new bookings until you release the hold.",
          "High and Critical clients also appear in the weekly email digest.",
        ],
      },
    ],
  },
  {
    path: "/client-portal",
    title: "Client Portal",
    summary: "A private page where your clients follow their campaigns, approve work, accept proposals and see their account.",
    topics: [
      {
        title: "Give a client access",
        steps: [
          "Go to CRM & Leads, open the Clients tab.",
          "Click Invite to Portal on the client's row. Their status changes to Invited, then Active.",
          "The client signs in at the client login page. Each client sees only their own data.",
        ],
      },
      {
        title: "What clients can do",
        steps: [
          "Overview shows live campaigns, outstanding and overdue amounts, and what needs their attention.",
          "Campaigns: see screens, creatives and proof-of-play photos. Approve a creative or request changes with a comment.",
          "Proposals: read the proposal and accept it by typing their name, or decline it.",
          "Invoices: view and print the invoice. Click I have paid to send a payment reference.",
          "Payments and Statement: payment history and a printable account statement.",
          "Messages: send a message to your team.",
        ],
      },
      {
        title: "What you get back",
        steps: [
          "You get a notification when a client approves or rejects a creative, accepts or declines a proposal, says a payment was made, or sends a message.",
          "A payment note does not change any balance. Check your bank, then record the payment in Finance.",
          "Only creatives in Client review, and proposals marked as Sent, appear for the client to act on.",
        ],
      },
    ],
  },
  {
    path: "/marketplace",
    title: "Marketplace",
    summary: "List your screens on a public page and receive booking requests. Rates are never shown to the public.",
    topics: [
      {
        title: "Set up your public page",
        steps: [
          "Open the Page & Sharing tab, tick Turn the public page on, add a headline, about text and contact details, then click Save.",
          "Copy the link or share it on WhatsApp. Anyone with the link can see the page, no login needed.",
        ],
        tip: "Rates stay private. Visitors only send a request and your team replies with a quote.",
      },
      {
        title: "List your screens",
        steps: [
          "In Listings click Edit listing on a screen. Add a public title, description, minimum booking days and a photo (upload or link).",
          "Tick Show this screen on the public page, or use List now / Unlist on the card.",
        ],
      },
      {
        title: "Handle requests",
        steps: [
          "New requests appear in the Requests tab and send you a notification. Screens that are already booked for the asked dates are marked busy.",
          "Change the status (New, Contacted, Quoted, Won, Lost) or click Convert to Lead to create a CRM lead.",
          "From the lead, continue with a Proposal and a Campaign as usual.",
        ],
      },
    ],
  },
  {
    path: "/notifications",
    title: "Notifications",
    summary: "Real alerts about payments, overdue invoices, proposals, credit limits, campaigns and new leads.",
    topics: [
      {
        title: "Use notifications",
        steps: [
          "The bell in the top bar shows how many are unread. Click it for the latest eight.",
          "Click a notification to open the related page. It is marked as read.",
          "Filter by category, or tick Unread only. Use Mark all read, Clear read, or Dismiss on a single item.",
        ],
      },
      {
        title: "What creates a notification",
        steps: [
          "Finance: a payment was received, an invoice is overdue, or a client says they paid.",
          "Proposals: expiring in 3 days, no reply for 5 days, accepted or declined by the client.",
          "Credit: a client reaches 80% or exceeds their credit limit.",
          "Campaigns: starting or ending within 3 days, or a client approved or rejected a creative.",
          "CRM: a new lead was added or a client sent a message.",
        ],
      },
      {
        title: "Choose what you see",
        steps: [
          "Click Preferences and untick the categories you do not want. This applies only to you.",
          "You only see categories you have permission for, for example Finance needs finance access.",
        ],
      },
    ],
  },
  {
    path: "/admin",
    title: "Admin & Roles",
    summary: "Company profile, team, permissions, security and activity log.",
    topics: [
      {
        title: "Complete your company profile",
        steps: [
          "Fill in the Company Profile: name, address, phone, NTN, bank details and invoice settings.",
          "Click Save company profile. These details print on invoices and reports.",
          "The Company name you save here is used everywhere: the sidebar, top bar, Admin page, emails, proposals, the client portal and documents.",
        ],
      },
      {
        title: "Set or change your password",
        steps: [
          "Open Admin, and find the Set a password box under Security.",
          "Type a new password (at least 8 characters) twice and click Save password. If you already have one, enter the current password too.",
          "After saving, other devices are signed out. You can sign in with your email and password on the sign-in page.",
          "Forgot your password? Click Forgot your password? on the sign-in page and follow the link in your email.",
        ],
      },
      {
        title: "Export all my data",
        steps: [
          "Only the owner can do this. Open Admin and click Export all my data (ZIP).",
          "Tick Include uploaded files if you also want your artwork and proof photos. Keep the page open until the download finishes.",
          "The ZIP has one CSV (opens in Excel) and one JSON file for each kind of data, plus your files. Passwords and secret keys are never included.",
          "Do this before you cancel your subscription, and keep the ZIP safe.",
        ],
      },
      {
        title: "Sign in with Google",
        steps: [
          "On the login page, click Continue with Google (shown only when Google sign-in is switched on).",
          "Google sign-in works only for an existing AdPilot account that uses the same verified Google email. It never creates an account by itself.",
        ],
      },
      {
        title: "Invite and manage your team",
        steps: [
          "Click Invite employee, enter their email and pick a Role (it fills the permissions).",
          "Adjust the permission checkboxes if needed and click Send invitation.",
          "Invitations expire after 72 hours. Use Resend invite to send a new link.",
          "Use Permissions to edit access, Suspend or Reactivate to pause access, and Remove to delete.",
        ],
      },
      {
        title: "Default currency",
        steps: [
          "In the Default currency card choose a new currency and confirm.",
          "Existing invoices keep the currency they were created with.",
        ],
      },
      {
        title: "Company logo",
        steps: [
          "Open the Company tab and use the Company logo card to upload a PNG, JPG or WebP (max 1 MB).",
          "The logo shows in the sidebar, top bar, proposals and client portal documents. Use Remove to go back to the initial.",
        ],
      },
      {
        title: "Role templates",
        steps: [
          "In the invite or permissions form, pick a template to fill the permission checkboxes in one click.",
          "Use Save as template to keep your own set of permissions for later. Up to 20 templates per company.",
        ],
      },
      {
        title: "Activity log and security",
        steps: [
          "Open the Activity tab to search the log, filter by action and Export CSV.",
          "It records team, profile, currency, logo, template and credit changes, with who and when.",
          "The Security card on the Overview tab shows active sessions and accounts that still need attention.",
        ],
      },
    ],
  },
];

export const GENERAL_TOPICS: GuideTopic[] = [
  {
    title: "Search anything",
    steps: ["Press Ctrl+K (or use the search box in the top bar) to jump to any page quickly."],
  },
  {
    title: "Typical order of work",
    steps: [
      "Complete your company profile, then add your screens in Inventory.",
      "Add clients (or leads) in CRM & Leads.",
      "Send a Proposal, and when the client accepts, convert it to a campaign. Check Credit Risk before booking big accounts.",
      "Approve the creative, then run it with the Screen player and follow it in Live Operations.",
      "Collect proof of play with the Field Proof phone page. Your client sees it in the Client Portal.",
      "Create an invoice, receive the payment, and track results in Finance, Analytics & Reports and Dashboard.",
      "Optional: list screens on the Marketplace public page to receive booking requests (rates stay private).",
    ],
  },
];

export function guideForPath(path: string): PageGuide | null {
  const match = [...PAGE_GUIDES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((g) => path === g.path || path.startsWith(g.path + "/"));
  return match ?? null;
}

export interface GuideHit {
  page: PageGuide;
  topic: GuideTopic;
}

/** Simple keyword search over every topic in the app. */
export function searchGuides(query: string): GuideHit[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  const hits: { hit: GuideHit; score: number }[] = [];
  for (const page of PAGE_GUIDES) {
    for (const topic of page.topics) {
      const hay = `${page.title} ${topic.title} ${topic.steps.join(" ")} ${topic.tip ?? ""}`.toLowerCase();
      const titleHay = `${page.title} ${topic.title}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (titleHay.includes(w)) score += 3;
        else if (hay.includes(w)) score += 1;
      }
      if (score > 0) hits.push({ hit: { page, topic }, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 8).map((h) => h.hit);
}
