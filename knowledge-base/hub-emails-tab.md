## Emails Tab — Email Template Editor

### Accessing the Emails Tab
Click the **Emails** tab in the event navigation bar.

### What You See on This Page
The Emails tab shows the **Email Template** editor with the note: "Sent automatically after successful registration"

### Email Template Fields
- **To** — pre-filled with the registrant's email
- **Cc/Bcc** — click the **▶ Cc/Bcc** toggle to show CC and BCC fields
- **From** — auto-generated as [subdomain]@veent.io
- **Reply-To** — editable field for your reply-to address
- **Subject** — editable (default: "[Event Name] - Order Confirmation")

### Email Body Editor
- Toggle between **Rich Text** and **HTML** modes
- Rich text toolbar includes formatting options
- Shows "Header ends above" and "Footer starts below" markers
- Default body: "Hello {{firstName}} {{lastName}}! Here is your personalized QR Code, which will grant you entry to the event venue."

### Insert Variables
Click the variable buttons below the editor to insert dynamic content:
- **@ First name** — inserts {{firstName}}
- **@ Last name** — inserts {{lastName}}
- **@ Contact Number** — inserts {{contactNumber}}
- **@ Email** — inserts {{email}}
- **@ Tickets** — inserts {{tickets}} (ticket QR code card)

### Email Preview
Below the editor, you can see a live preview of the email, including:
- The Veent logo at the top
- The greeting with the registrant's name
- The QR code ticket card showing ticket type and event name

### Saving
Click the **Save Template** button (bottom right) to save your changes.

### When Are Emails Sent?
Emails are sent automatically after successful registration (payment confirmation or free order completion).
