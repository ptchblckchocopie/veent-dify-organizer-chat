## Complete Dashboard Navigation — Button-by-Button Guide

This guide explains exactly what to click and what you'll see at each step.

### Dashboard Layout Overview
When you log in to hub.veent.io, you see:
- **Top bar**: Veent logo, "Dashboard" link, "Wallet" link, your name (top right)
- **Event list**: Your events with their names, dates, and status
- **Create Event button**: To create a new event

### How to Open an Event
From the Dashboard Home, click on any event name or card. This takes you inside that event's dashboard.

### Inside an Event — Tab Navigation
Once inside an event, you see:
- **Event header**: Event name, dates, location, public URL, "Edit Event" button (red), status badge
- **7 tabs** in a horizontal row: **Analytics | Attendees | Posts | Registration | Vouchers | Emails | Staff**
- Click any tab to switch between sections. The selected tab is highlighted in red.

---

### Tab: Analytics
**How to get here:** Click the **Analytics** tab
**What you see:**
- Date range filter at the top
- Quick stats circles
- Tickets by Type section (with Gross/Printed toggle)
- Gross Purchases by Ticket section
- Referrer Summary (with "Create a Referral Link" button)
- Voucher Summary
- Net Revenue Trend chart

---

### Tab: Attendees
**How to get here:** Click the **Attendees** tab
**What you see:**
- Revenue summary at top (click **Show** to reveal numbers, **View Breakdown** for details)
- Three sub-tabs: **Registrants** | **Guest List** | **Pending Payments**
- Action buttons: **Export**, **Generate Google Sheet**, **Check In**, **Undo Check In**
- Registrant table with columns: Ticket, Name, Phone, Registered
- **All Tickets** dropdown to filter by ticket type
- **Columns** button to show/hide table columns

**To export attendee data:** Click **Export** button → choose CSV or Excel
**To export to Google Sheets:** Click **Generate Google Sheet** button
**To check in attendees:** Select rows with checkboxes → click **Check In** button

---

### Tab: Posts
**How to get here:** Click the **Posts** tab
**What you see:**
- Page heading "Posts" with note about where posts appear
- **+ Add Post** button

**To create a post:**
1. Click **+ Add Post** button
2. A drawer/panel opens on the right side
3. Fill in: Heading (title), Image (upload photo), Post description (rich text editor)
4. Click **Save changes** to publish, or **Cancel** to discard

---

### Tab: Registration
**How to get here:** Click the **Registration** tab
**What you see — this page has TWO main areas:**

**LEFT SIDE — Tickets:**
- Heading "Tickets" with **Pricing Calculator** button and **Add Ticket** button
- List of existing tickets showing: name, date range, price, sold/remaining counts
- Each ticket has a three-dot menu (⋮) for Edit/Delete options
- **Filter Tickets** dropdown

**RIGHT SIDE — Form Builder:**
- Heading with your form name (e.g., "Nukie Blaze Run Registration Form")
- **Preview** and **Edit** buttons at the top
- Shows current form fields: First Name*, Last Name*, Contact Number*, Email* (these are default and required)
- **+ Add new form** button at the top to create additional forms

**To add a ticket:**
1. Click **Add Ticket** button
2. A dialog opens with these fields:
   - **Ticket Name** (text)
   - **Price** (number, in ₱)
   - **Quantity** (number)
   - **Ticket Image** (optional, image upload)
   - **Description** (optional text)
   - **Status** (active/inactive)
   - **Min Order** / **Max Order** (numbers)
   - **Sales Start** / **Sales End** (date + time pickers)
   - **Display options**: Show time for Sales Start, Show time for Sales End
   - **Ticket Color** (color picker)
   - **Display Settings** section: **Package Ticket** toggle
3. Click **Create Ticket** to save, or **Cancel** to discard

**To use the Pricing Calculator:**
1. Click **Pricing Calculator** button
2. A dialog opens showing:
   - Current Event Rates: Transaction Fee (7.0%), Convenience Fee (₱20)
   - **Target Ticket Price** field (enter your desired price)
   - **Pass on Transaction Fee** toggle (buyer pays the 7.0% fee)
   - **Pass on Convenience Fee** toggle (buyer pays ₱20 per ticket)
   - **Number of Tickets** field (for total calculation)
3. The fee breakdown updates in real time as you change values
4. Click **Close** when done

**To edit form fields:**
1. Click the **Edit** button above the form fields on the right side
2. You can then modify, reorder (drag and drop), or remove fields

---

### Tab: Vouchers
**How to get here:** Click the **Vouchers** tab
**What you see:**
- **Create Voucher** button
- Search bar
- List of existing vouchers (if any)

**To create a voucher:**
1. Click **Create Voucher** button
2. A form appears with these fields:
   - **Promo Code** (the exact code customers will type)
   - **Status** (Active/Inactive)
   - **Usage Type** dropdown: Single-Use, Multiple-Use, Unlimited, Target Price
   - **Usage Limit** (max times this code can be used)
   - **Discount Type** dropdown: Percentage Off or Fixed Amount
   - **Discount Percentage/Amount** (enter number, e.g., 30 for 30%)
   - **Start Date** (optional — leave empty for immediate)
   - **Expiry Date** (required)
   - **Minimum Order Amount** (optional, in ₱)
   - **Applicable Ticket Types** (select which tickets this voucher works for, or Select All)
3. Click **Create Voucher** to save, or **Cancel** to discard

---

### Tab: Emails
**How to get here:** Click the **Emails** tab
**What you see:**
- Email Template editor with note: "Sent automatically after successful registration"
- **To** field (pre-filled with registrant's email)
- **▶ Cc/Bcc** toggle (click to show CC and BCC fields)
- **From** field (auto-generated as [subdomain]@veent.io)
- **Reply-To** field (editable)
- **Subject** field (default: "[Event Name] - Order Confirmation")
- Toggle between **Rich Text** and **HTML** editing modes
- Email body with markers: "Header ends above" and "Footer starts below"
- **Insert Variable** buttons below the editor:
  - **@ First name** → inserts {{firstName}}
  - **@ Last name** → inserts {{lastName}}
  - **@ Contact Number** → inserts {{contactNumber}}
  - **@ Email** → inserts {{email}}
  - **@ Tickets** → inserts {{tickets}} (QR code ticket card)
- **Save Template** button at bottom right
- Email preview below showing how the email will look

---

### Tab: Staff
**How to get here:** Click the **Staff** tab
**What you see — this page has TWO sections:**

**TOP — Staff List:**
- Heading "Staff List" with subtitle "Your Staff History"
- **Invite Staff** button (red)
- Table showing: Name, Email, Role, Actions

**BOTTOM — Scanning Areas:**
- Heading "Scanning Areas" with subtitle "Manage scanning areas for check-ins"
- **New Scanning Area** button (red)
- Two sub-tabs: **Areas** | **For Approval**
- Search bar for scanning areas

**To invite a staff member:**
1. Click **Invite Staff** button (red)
2. A dialog opens with:
   - **Email** field (enter their email address)
   - **Role** dropdown: Manager, Editor, Viewer (Scanner role is assigned differently)
3. Click **Invite** to send, or **Cancel** to discard

**To create a scanning area:**
1. Click **New Scanning Area** button (red)
2. A dialog opens with:
   - **Name** field (required — e.g., "Main Entrance", "VIP Gate")
   - **Description** field (optional)
   - **Allowed Ticket Types** (leave empty to allow all tickets, or select specific ones)
   - **Settings** section:
     - **Active** toggle (active areas can be used for check-ins)
     - **Allow Multiple Scans** toggle (allows tickets to be scanned more than once)
3. Click **Create Area** to save, or **Cancel** to discard

---

### Edit Event — How to Access
**How to get here:** Click the **Edit Event** button (red, top right of the event header)
**What happens:** You're taken to the Edit Event section with a LEFT SIDEBAR showing 5 sub-pages:

| Sub-page | Click to access | What you can change |
|----------|----------------|-------------------|
| **Edit Details** | Click "Edit Details" in left sidebar | Event name, subdomain, country, dates, location, description, recurring event toggle |
| **Settings** | Click "Settings" in left sidebar | Maintenance mode, registration options, payment settings, labels |
| **Visual** | Click "Visual" in left sidebar | Theme, logo, event logo, poster, background image, embed link |
| **Contacts** | Click "Contacts" in left sidebar | Organizer contact information (Add Contact button) |
| **Registration Instructions** | Click "Registration Instructions" in left sidebar | Instructions shown to registrants (Add Instruction button) |

There is also a **Back** button at the top to return to the event dashboard.

---

### Edit Event > Edit Details
**How to get here:** Edit Event → click **Edit Details** in left sidebar
**Fields you can edit:**
- **Event name** — the public title
- **Subdomain** — URL slug (shown as [subdomain].veent.net)
- **Event Country / Currency** — READ-ONLY after creation ("Country cannot be changed after event creation")
- **Event address** — search field with interactive map (Leaflet/OpenStreetMap)
- **Enable Recurring Event** checkbox
- **Event Starts** — date picker + time picker (Philippine Standard Time)
- **Event Ends** — date picker + time picker ("For same-day events, use the same date for both fields")
- **Event description** — rich text editor

Click **Save changes** to save, or **Cancel** to discard.

---

### Edit Event > Settings
**How to get here:** Edit Event → click **Settings** in left sidebar
**This page has THREE sections:**

**Section 1: Event Management**
- **Maintenance Mode** toggle — shows maintenance message to users when enabled

**Section 2: Registration**
- **Hide Event Description** toggle
- **Hide QR Code on Success Page** toggle
- **Require Invitation Code** toggle
- **Invite Links** — Generate Shareable Invite Links
- **Submit Button Label** — customize the submit button text
- **Ticket Container Message** — message shown in ticket selection area (max 32 chars)
- **Ticket Selection Label** — label for ticket selection field (max 32 chars)
- **Contact Section Heading** — shown above contact cards on registration (max 32 chars)
- **Form Selection Label** — label for form selection field (max 32 chars)
- **Package Ticket Label** — label for package ticket selection (max 32 chars)
- **QR Code Registration Message** — message shown while waiting for payment

**Section 3: Payments & Tickets**
- **Require Voucher Code** toggle — makes voucher required (invite-only events)
- **Max Total Tickets Per Order** — limit how many tickets one person can buy
- **Enable Booking Tickets** toggle

Click **Save Settings** at the bottom to save all changes.

---

### Edit Event > Visual
**How to get here:** Edit Event → click **Visual** in left sidebar
**What you can change:**
- **Theme** — Select Theme dropdown
- **Logo** — company/organizer logo (image upload, shows file type and size)
- **Event Logo** — Select Event Logo button
- **Poster** — event poster image (image upload)
- **Background Image** — registration page background (image upload)
- **Embed Link** — YouTube/Vimeo embed URL

Click **Save Changes** to save, or **Cancel** to discard.

---

### Edit Event > Contacts
**How to get here:** Edit Event → click **Contacts** in left sidebar
**What you see:**
- "Basic Information" heading
- "Edit your contact details below. Changes update automatically on your website."
- **Add Contact** button to add organizer contact information

---

### Edit Event > Registration Instructions
**How to get here:** Edit Event → click **Registration Instructions** in left sidebar
**What you see:**
- "Registration Instructions" heading
- "Add Specific Instructions for your registrants."
- **Add Instruction** button to add entry instructions or requirements

---

### Top Header Navigation
Available from any page:
- **Dashboard** link — goes to the home page (event list)
- **Wallet** link — goes to your earnings/withdrawal page
- **Your name** (top right) — profile and account options

### Wallet Page
**How to get here:** Click **Wallet** in the top header bar
**What you see:** Your earnings summary, payout history, and withdrawal options
