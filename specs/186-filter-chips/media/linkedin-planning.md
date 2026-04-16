An analyst asking for "UK submarines" doesn't want plots that happen to contain one British ship *and*, separately, one submarine from somewhere else. But that's exactly what two independent filter chips give you today — and the analyst rarely notices the false positives.

The next Future Debrief filter-bar change closes that gap. A new "platform" chip carries a compound set of attributes — nationality, domain, vessel role, type, class — all tied to the same platform record. One chip, evaluated as a joined query over the per-platform metadata array.

Most of the groundwork is already done: per-platform records landed in an earlier ticket, and the CQL2 engine learned the `array_filter` primitive last month. This is the small, high-leverage UI piece that finally puts joined queries in analysts' hands.

The open design question: should "UK or French submarines" be one chip with a multi-select, or two chips in an OR container? Genuinely not sure yet — would welcome views from anyone who's watched analysts use filter UIs of this shape.

[Read the full post: <link-placeholder>]

#FutureDebrief #MaritimeAnalysis #OpenSource
