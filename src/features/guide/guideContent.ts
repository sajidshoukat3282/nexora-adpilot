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
          "Fill in the name, city, location, size and daily rate. Use Search Location or enter Latitude and Longitude so it appears on the map.",
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
          "Expenses and Activity show costs and the change history.",
          "Creatives: add artwork with a Drive/Dropbox/image link. Changing the link creates a new version.",
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
    summary: "Monitor screens in real time and respond to problems.",
    topics: [
      {
        title: "Monitor screens",
        steps: [
          "Each tile is a screen with its current status (Online, Warning, Maintenance or Offline).",
          "Use the status filter to focus on problem screens.",
          "Click a screen to see Device Health, Last Heartbeat, Temperature, Storage Used, Network, Current Assignment and Recent Playback.",
        ],
      },
      {
        title: "Handle alerts",
        steps: [
          "The Alerts panel lists issues that need attention, such as offline screens.",
          "Open the affected screen and check its device health.",
        ],
      },
      {
        title: "Emergency Override",
        steps: [
          "Tick the checkbox on one or more screens.",
          "Click Emergency Override at the top of the page.",
          "Select the Approved Creative to play and enter the Reason, then confirm. Only users with the override permission can do this.",
        ],
        tip: "Overrides are for urgent situations, such as a wrong ad running.",
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
    summary: "What your clients see when they sign in: campaigns, invoices and payments.",
    topics: [
      {
        title: "Give a client access",
        steps: [
          "Go to CRM & Leads, open the Clients tab.",
          "Click Invite to Portal on the client's row. Their status changes to Invited, then Active.",
          "The client signs in at the client login page.",
        ],
      },
      {
        title: "What clients see",
        steps: [
          "Your Campaigns: their campaigns and status.",
          "Your Invoices: amounts, issue and due dates.",
          "Payment History: payments received, with date and method.",
        ],
      },
    ],
  },
  {
    path: "/marketplace",
    title: "Marketplace",
    summary: "A network connecting media owners, agencies and advertisers (coming soon).",
    topics: [
      {
        title: "Status",
        steps: [
          "The Marketplace is marked Coming Soon. Nothing is needed from you yet.",
          "Keep your Inventory up to date so you are ready when it opens.",
        ],
      },
    ],
  },
  {
    path: "/notifications",
    title: "Notifications",
    summary: "Everything AdPilot has flagged across campaigns, operations, creatives and finance.",
    topics: [
      {
        title: "Use notifications",
        steps: [
          "Filter by type: Campaign, Creative, Finance, Inventory, Operations or System.",
          "Click a notification to open it. It is marked as read.",
          "Use Mark All Read to clear everything at once, or switch between All and Unread.",
          "The red badge on the bell in the top bar shows how many are unread.",
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
        title: "Activity log and security",
        steps: [
          "The Activity Log records who changed the team, profile and currency, and when.",
          "The Security card shows active sessions and accounts that still need attention.",
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
      "Create a campaign and attach screens.",
      "Create an invoice, receive the payment, and track results in Finance and Dashboard.",
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
