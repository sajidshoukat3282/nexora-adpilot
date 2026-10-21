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
          "Choose the Screen Type: Digital Screen or Static Billboard.",
          "Fill in the name, City, Dimensions / Size, daily rate and Currency.",
          "Use Search Location, or enter Latitude and Longitude, so it appears on the map.",
          "Set Status (Online, Offline or Maintenance) and click Save Screen.",
        ],
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
        tip: "Availability is checked against existing bookings, so double-booking is avoided.",
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
          "Tabs: Overview, Inventory, Schedule, Creatives, Approvals, Delivery/Screens, Proof of Play, Analytics, Billing & Financials and Activity.",
          "Inventory: attach screens to the campaign.",
          "Creatives and Approvals: add artwork, then Approve or Reject it.",
          "Billing & Financials: see the contract value and what has been invoiced.",
        ],
      },
      {
        title: "Change campaign status",
        steps: [
          "Use the status control at the top of the campaign workspace. It offers only the next valid statuses, for example Draft, Booked and Live.",
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
    summary: "The Enterprise Report Center: revenue, expenses, receivables and campaign reports.",
    topics: [
      {
        title: "Read and share reports",
        steps: [
          "Review the totals: Total Revenue, Total Expenses and Pending Receivables.",
          "Click Excel to download the report as a spreadsheet.",
          "Click Print / PDF to print it or save it as a PDF.",
        ],
        tip: "Your company letterhead (from Admin & Roles) is printed on reports.",
      },
      {
        title: "Automated Weekly Report",
        steps: [
          "In the weekly email card, choose the day (Select Day, Every Monday to Sunday).",
          "Add any extra email addresses that should receive it.",
          "Save the settings. The report is emailed automatically each week.",
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
    summary: "Build, send and track commercial proposals.",
    topics: [
      {
        title: "Create a proposal",
        steps: [
          "Click New proposal.",
          "Enter Campaign Name, Client, Start Date and End Date.",
          "Add Inventory Line Items (screens with days and rate per day). Totals are calculated for you.",
          "Save it. The proposal appears in the list with its status and total.",
        ],
      },
      {
        title: "Track and close",
        steps: [
          "Open a proposal to see the Media Proposal with Subtotal and Total.",
          "The top cards show your Open pipeline and Accepted value.",
          "When the client accepts, the proposal is Ready to book.",
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
    summary: "See which clients owe too much and stay within credit limits.",
    topics: [
      {
        title: "Watch exposure",
        steps: [
          "Top cards show Total Credit Limit, Total Outstanding Balance and High Risk Clients.",
          "The table lists each client with Credit Limit, Outstanding Balance, Credit Utilization and Risk Status.",
          "Credit Limit Alert warns you when a client is close to or over their limit.",
        ],
      },
      {
        title: "Change a credit limit",
        steps: [
          "Click Update Credit Limit on a client.",
          "Enter the New Credit Limit and save.",
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
