# Official India Disaster-Alert Provider Assessment

## Evidence reviewed

The official [NDMA SACHET portal](https://sachet.ndma.gov.in/) describes a CAP-based, geo-targeted, multilingual, multi-media warning system. Its RSS page identifies SACHET as a pan-India portal for warnings issued by authorized alert-generating agencies and state or union-territory disaster-management authorities. It also links an **Integration Guide for Agencies**, which is the appropriate source for any endpoint, feed-format, and permitted-use details.

The [C-DOT CAP Integrated Alert System](https://www.cdot.in/cdotweb/web/product_page.php?lang=en&catId=9&pId=49) confirms the service supports CAP alerts across multiple media, including RSS and mobile applications. This does **not** authorize Air-Mesh to originate alerts, access cell broadcast, or claim official affiliation.

## Current decision

Air-Mesh will remain local-first and show its provider as **not configured** until the RSS/CAP endpoint, allowed consumption terms, refresh policy, and test data are verified from the agency guide or a written authorization. The app can still make local safety tools, offline guides, incident reports, and encrypted local chat available without a login.

## Proposed integration boundary

If use is authorized, a server-side read-only adapter will fetch and validate the official CAP/RSS source, reject malformed or expired records, preserve source and update timestamps, and mirror approved alerts to durable on-device storage. It will never generate or modify emergency instructions, claim delivery through SMS or cell broadcast, or disclose provider credentials to the app.

## How an organization can request access

The current SACHET site links an agency integration guide and lists the NDMA control-room contact details: `controlroom@ndma.gov.in` and `+91-11-26701728`. An organization should request **read-only CAP/RSS consumption approval**, identify the target districts and languages, describe its user population and safeguarding plan, and ask for the CAP feed identifier plus the applicable rate, retention, attribution, and incident-escalation requirements. The guide requires ETag/`If-None-Match` caching after the first retrieval; this must be implemented before any production connection.
