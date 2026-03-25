## Emails — Confirmation Templates

### Where Is the Email Editor?
Click the **Emails** tab.

### When Are Emails Sent?
Automatically after successful registration (payment confirmation or free order completion).

### Email Template Fields
| Field | Description |
|-------|-------------|
| **To** | Pre-filled with registrant's email |
| **Cc/Bcc** | Click ▶ Cc/Bcc toggle to reveal |
| **From** | Auto-generated: [subdomain]@veent.io |
| **Reply-To** | Your custom reply-to address |
| **Subject** | Default: "[Event Name] - Order Confirmation" |

### Email Body Editor
- Toggle between **Rich Text** and **HTML** modes
- Shows "Header ends above" and "Footer starts below" markers
- Default body includes greeting + QR code ticket

### Insert Variables
Click the buttons below the editor:
| Button | Inserts | Shows |
|--------|---------|-------|
| **@ First name** | {{firstName}} | Registrant's first name |
| **@ Last name** | {{lastName}} | Registrant's last name |
| **@ Contact Number** | {{contactNumber}} | Phone number |
| **@ Email** | {{email}} | Email address |
| **@ Tickets** | {{tickets}} | QR code ticket card |

### Email Preview
Below the editor, a live preview shows how the email looks with the QR code.

### Saving
Click **Save Template** (bottom right).

### FAQ
**Q: What email address are emails sent from?** [subdomain]@veent.io, based on your event's subdomain.
**Q: How do I resend a confirmation email?** Go to Attendees tab, find the person, click "Resend Email".
**Q: Can I customize confirmation emails?** Yes, edit the template in the Emails tab using variables.