## Payments — Gateways, Fees & Configuration

### Supported Payment Gateways
| Gateway | Currency | Market |
|---------|----------|--------|
| **Maya** | PHP | Philippines |
| **Stripe** | SGD, USD | Singapore, International |

The gateway is determined by the event's currency (set during creation, cannot be changed).

### Fee Settings
Access via: **Edit Event > Settings > Payments & Tickets**

| Setting | Description | Default |
|---------|-------------|---------|
| **Transaction Fee** | Payment gateway fee | 7% |
| **Pass On Transaction Fee** | Buyer pays the fee | false (organizer absorbs) |
| **Convenience Fee** | Fixed fee per ticket | ₱20 (2000 cents) |
| **Pass On Convenience Fee** | Buyer pays the fee | false (organizer absorbs) |

### Fee Calculation Examples
**Organizer absorbs fees:** Ticket ₱1,000 → Buyer pays ₱1,000 → Organizer gets ₱910
**Buyer pays fees:** Ticket ₱1,000 → Buyer pays ₱1,095.27 → Organizer gets ₱1,000

### Pricing Calculator
Click **Registration** tab → **Pricing Calculator** button to see fee breakdown in real time.

### Order Timeout
Default 15 minutes. Unpaid orders release reserved tickets. Change via Edit Event > Settings > **Reservation Expiry**.

### Free Orders
Orders totaling ₱0 skip payment gateway. Still require form completion.

### Test Mode vs Live Mode
- **Test Mode**: Payments simulated, no real money. Yellow banner shows.
- **Live Mode**: Real transactions processed.
- Switch by clicking **"Ready to go live?"** red button on event page.

### FAQ
**Q: What happens if payment fails?** Order times out, reserved tickets released, customer can try again.
**Q: How long do customers have to pay?** Default 15 minutes. Adjust "Reservation Expiry" in Settings.
**Q: Who pays transaction fees?** You choose in Settings. Toggle "Pass On Transaction Fee" to make buyers pay.