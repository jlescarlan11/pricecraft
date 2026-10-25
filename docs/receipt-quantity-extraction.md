# Receipt quantity and unit extraction repair

The production prompt treated package size as a count: a real Groq request with
fictional `Demo Chocolate 150G 36.50V` returned quantity 1 and no unit. The app
needs the total purchased amount in the selected unit, such as 150 g, 0.27 kg,
or 3 l for two 1.5 l bottles. The earlier quantity follow-up was still local
when the separate consent change was published.

Groq remains the extractor. Version `prompt-v2:quantity-evidence-v2` asks for
purchased amounts, including weighted-goods continuation lines and combined
purchases. The response validator reconciles straightforward amounts against the
existing receipt parser, attaches unambiguous source text, normalizes unit aliases
to the review dropdown options, and rejects nonpositive/invalid quantities.

A valid measured amount returned by Groq survives when the line parser lacks
quantity evidence. Bare matched items without an amount or model unit remain
unknown, instead of inheriting a default count of 1. Unknown rice size in the
original example cannot safely be inferred from its tax-marker text.

Evidence matching retains any explicit pack size in the extracted item name.
It requires one compatible source row at the same price; a merged total must not
borrow a different variant's single-row quantity. Rows with multiple size/count
expressions or count multipliers do not override the extractor's total amount.
A following weight multiplied by its unit price is accepted only when the existing
parser validates its arithmetic against the billed amount.

Regression coverage includes the supplied pork/chocolate OCR example, duplicate
and different-size purchases, counts before/after product sizes, unit aliases,
invalid quantities, ambiguous source matches, and weight continuations with and
without `@`. A hook-to-review integration test confirms 200 g reaches the editable
fields, original capture and source snippet. Live API tests use fictional text;
they exercise this service directly, so heuristic fallback cannot mask failure.
Browser QA also uses fictional text and does not save any receipt or start training.

This improves structured extraction after OCR. It cannot recover characters the
OCR engine never read. Review against the original photo remains required. Saved
predictions and user corrections are not rewritten; an existing open scan keeps
its previous extraction until rescanned. Consent controls and Groq selection are
unchanged by this repair.
