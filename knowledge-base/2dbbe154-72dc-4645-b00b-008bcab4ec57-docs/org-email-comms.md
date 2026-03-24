## Emails Tab — Email Template

Access via: **Event Management Page > Emails tab**

The page heading is "Email Template" with the note: "Sent automatically after successful registration." The confirmation email is sent automatically to attendees after they successfully register and pay (or complete a free registration).

### Email Template Editor
The editor fields are: **To** (pre-filled with {{email}}, the registrant's email), **Cc/Bcc** (click toggle button to show Cc and Bcc fields), **From** (auto-generated as [subdomain]@veent.io based on your event's subdomain), **Reply-To** (editable text field for your reply-to address), and **Subject** (editable, default "[Event Name] - Order Confirmation"). You can toggle between **Rich Text** and **HTML** modes. The rich text toolbar includes Normal, bold, italic, underline, strikethrough, ordered list, bullet list, blockquote, code-block, link, and clean. Markers in the editor show "Header ends above" and "Footer starts below." The default body text is: "Hello {{firstName}} {{lastName}}! Here is your personalized QR Code..."

### Insert Variable Buttons
Click these buttons to insert dynamic content: **@ First name** inserts {{firstName}} (registrant's first name), **@ Last name** inserts {{lastName}} (registrant's last name), **@ Contact Number** inserts {{contactNumber}} (registrant's phone), **@ Email** inserts {{email}} (registrant's email), and **@ Tickets** inserts {{tickets}} (ticket details).

### Saving and Preview
Click **Save Template** to save changes. Below the editor is an HTML Template Preview iframe showing how the email will look.
