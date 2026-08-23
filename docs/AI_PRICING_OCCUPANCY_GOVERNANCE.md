# AI pricing and occupancy governance

Pricing or occupancy models may generate bounded recommendations from authorized historical demand, availability, seasonality, and event signals. They may not silently change a supplier's public price, stop-sell state, stay restriction, or inventory. A supplier or authorized administrator must review and explicitly apply each recommendation.

Record model/version, input window, recommendation, confidence, constraints, reviewer, decision, and resulting change. Enforce floor/ceiling, parity, legal, fairness, tax, and contract constraints; evaluate forecast error and revenue impact; support rollback; and disable recommendations when data quality or model monitoring fails.

The partner hotel report provides a deterministic pre-model baseline from partner-scoped declared
room capacity, calendar limits, stop-sales, and confirmed non-no-show stays. It identifies booked
occupancy, calendar-open capacity, and reconciliation anomalies, but never writes a rate, inventory,
restriction, or stop-sale. Its text is operator guidance rather than an AI forecast; activating a
learned model still requires the controls above.
