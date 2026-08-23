# Administrator notification operations

`/admin/notifications` is the platform-administrator workbench for governed templates and
provider-neutral delivery posture. Delivery history uses bounded status, channel, time-window, and
search filters with 25-record pages and an explicit 1,000-match deep-history boundary.

The interface never renders raw recipients, provider references, delivery error contents, template
variables, or deduplication keys. A short one-way recipient reference supports safe correlation, while
provider acknowledgement and error evidence are presence-only indicators. Retry responses contain
only the delivery ID, queued status, and next-attempt timestamp.

Only failed or dead-letter deliveries can be requeued, and the retry transition uses a conditional
update so concurrent actions cannot overwrite a newer delivery state. Requeueing does not imply
delivery. Live email, SMS, WhatsApp, and push activation still requires approved senders, templates,
webhooks, suppression handling, provider credentials, and monitored infrastructure. Cashfree is not
part of this workflow.
