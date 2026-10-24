# Receipt corrections and training dataset

The scan workflow now saves the original image, the exact image submitted to OCR,
OCR text/evidence, immutable item predictions, and a history of human reviews.
This prepares supervised examples for **structured item extraction**. It does not
train a model automatically or provide verified character-level OCR transcripts.

## Reviewing a receipt

1. Scan a receipt and compare every prediction against the photo.
2. Correct the product name, total purchase quantity, unit, and line price. Keep
   names as printed; use unknown quantity/unit when the receipt does not establish
   them. For two 200 g packs, total purchase quantity is 400 g.
3. Label each predicted row Product or Not a product. An unchecked **Add to
   catalog** box is not a negative training label. Catalog additions require an
   explicit quantity and unit; dataset labels can preserve unknown values.
4. Add any missed products manually. Confirm the whole receipt was checked only
   after all products, including missed ones, are accounted for.
5. Save review. Partial reviews are saved and can be reopened from saved receipts.
   Only examples whose latest review is complete appear in **Export reviewed**.

Saving the source and review completes before catalog changes begin. A local
storage failure leaves the editor open with its edits. Reopening a review restores
labels but leaves catalog inclusion unchecked to avoid re-adding purchases.
Cancelling an unsaved scan does not retain its image.

## Storage and backup

- IndexedDB database `pricecraft-receipt-dataset`, store `examples`, stores image
  Blobs and metadata. Records are scoped to a user ID or the local guest owner.
- Guest receipts remain local. Signing in does not migrate guest data into an
  account. This is application-level local separation; browser storage is not an
  encrypted vault and is accessible to someone controlling the browser profile.
- Signed-in receipts attempt private Supabase backup after save, when reopening
  the scan page, when connectivity returns, or on **Retry cloud backup**.
- Both images must upload and the metadata upsert must succeed before that local
  revision is marked backed up. Failures retain the local record as pending.
- Cloud storage uses private bucket `receipt-training-images`; object names are
  `<user-id>/<receipt-id>/original` and `<user-id>/<receipt-id>/ocr-input`.
  Table `receipt_training_examples` contains the metadata and reviews. RLS limits
  images and table rows to their authenticated owner; anonymous access is denied.
- History, reopening, and export currently read this device's IndexedDB. Cloud
  restore/download and deletion/retention controls are not implemented here.
  Clearing browser site data removes local records; export reviewed examples
  before clearing it. No retention deadline or shared training access is enabled.

## Export format (schema version 1)

The JSON envelope has `schemaVersion`, `exportedAt`,
`labelScope: "structured-items-not-verbatim-transcription"`, and `examples`.
Each example includes:

- receipt ID, timestamps, original filename;
- original and OCR input images as MIME types and base64 data URLs;
- raw OCR text and provider evidence (OCR.space overlay output, or Tesseract line
  boxes and selected grouping);
- OCR provider/model, extractor, parser and preprocessing versions;
- original `predictedLines`, without replacing them with the user's corrections;
- append-only `reviews` with ID, timestamp, complete flag, and all labeled rows.

Each review row has a stable ID, `sourceIndex` into predictions (null for a manual
addition), label (`product`, `not-product`, `unreviewed`), catalog inclusion choice,
and corrected values. The account owner ID and local sync state are excluded from
export. Earlier partial reviews remain as provenance; the **latest complete
review's product rows** are the extraction targets. Rejected predictions provide
negative examples. A complete receipt with zero products is a valid empty target.

Exports include full receipt content, which can include identifiers. They are not
anonymized. Before assembling a shared training corpus, define consent and
redaction, deduplicate receipt images, and split by merchant/layout and receipt
identity so repeated scans cannot leak into both training and evaluation. Build a
held-out benchmark before fine-tuning. Character recognition training would need
additional verified transcripts/crops; do not treat raw OCR output as ground truth.

## Deployment and verification

Apply `supabase/migrations/20261024173435_receipt_training_examples.sql` through
the normal migration workflow before releasing the client. The schema snapshot
`supabase/schema.sql` contains the same objects for fresh installations. The bucket
has a 50 MiB per-object limit; failed uploads remain pending locally.

Development checks:

```sh
npm test -- --run
npm run lint
npm run build
# Against an isolated development Supabase database, as its postgres/admin role:
psql "$PRICECRAFT_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/receipt_training_access.sql
```

The SQL test creates disposable users and fixtures inside a transaction and rolls
back. It verifies owner access, cross-account and anonymous rejection, and private
bucket configuration. In this session it passed on isolated PostgreSQL 17 with
minimal Supabase auth/storage schema stubs; the full local Supabase runtime could
not start. Unit tests cover upload failures, retries and account isolation. Chrome
verification used the real review/storage/export components and a synthetic image
with the supplied OCR text; it did not measure OCR recognition accuracy.

The initial development session did not apply a remote migration or verify a real
Supabase Storage HTTP upload.

On 25 October 2026, the receipt training migration was applied transactionally to
the PriceCraft production project (`ddeekyvqnujlnbffauby`) through its SQL editor.
That project had no migration-history table, so this dashboard application is not
recorded in Supabase CLI migration history. Reconcile the existing schema before
using `supabase db push`; do not replay the initial schema against production.
The local CLI link points to a different project and must not be used as the
production target.

Release checks: 372 tests passed with one worker (the opt-in live Groq test was
skipped), the production build passed, and lint had zero errors with three existing
Fast Refresh warnings. The first concurrent build/test run hit two calculator test
timeouts; the complete rerun passed without code changes. A signed-in Storage HTTP
upload and complete production receipt workflow still require verification.
