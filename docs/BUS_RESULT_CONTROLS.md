# Bus result controls

The public bus-results page keeps the adapter response separate from the filtered result set.
This makes provider errors, a successful search with no returned services, and filters that hide
otherwise available services three distinct states.

Operator and bus-type filters are accepted only when their exact values exist in the current
returned-offer catalogue. Price and sort inputs use closed, bounded parsing. The clear-filter links
preserve origin, destination, travel date, and passenger count while removing only result controls.

Filtering is presentation-only. It does not change routes, seats, inventory, booking records,
settlements, provider requests, payments, or Cashfree behavior.
