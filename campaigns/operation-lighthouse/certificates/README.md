# Operation Lighthouse completion certificate

## Eligibility

Issue the certificate for **full attendance at the workshop and participation
in its hands-on activities**. Passing the core objectives of all five missions
is not required; advanced objectives are not required.

The facilitator confirms eligibility. This is a workshop completion
certificate, not an official GitHub certification, an academic qualification
or an automatically validated mission award.

## Template files

The English A4 landscape template files live alongside this README and
`build.ps1` in `campaigns\operation-lighthouse\certificates\`. Rebuilding
writes directly to this project directory:

| File | Purpose |
| --- | --- |
| [OL-CERTIFICATE-TEMPLATE-en.pptx](OL-CERTIFICATE-TEMPLATE-en.pptx) | Editable master with recipient, date and facilitator text fields |
| [OL-CERTIFICATE-TEMPLATE-en.pdf](OL-CERTIFICATE-TEMPLATE-en.pdf) | Print-format reference; replace the template fields before issuing |
| [OL-CERTIFICATE-TEMPLATE-en.png](OL-CERTIFICATE-TEMPLATE-en.png) | Quick visual preview |

Open the PowerPoint and replace `[PARTICIPANT NAME]`, `[COMPLETION DATE]` and
`[FACILITATOR NAME]`. Save a personalized copy, add the facilitator's actual
signature where appropriate, and export that copy to PDF. The template
contains no real participant information or simulated signature.

Keep each editable field on one line. For long names or dates, reduce the
font size as needed and review the exported PDF before printing. Do not rely
on automatic fitting after a paste or scripted edit; confirm that the entire
value is visible and remains comfortable to read.

Keep personalized copies outside source control. Do not add hours, accreditation,
certificate IDs or verification links unless they are supported by the actual
event and issuing process. No such claims are prefilled here.

Print on **A4, landscape, actual size**. The artwork has generous page margins
and a white background to avoid requiring full-bleed printing.

## Design and rebuild

The layout reuses the approved Operation Lighthouse and Copilot Agent Mission
Control logos. Text and graphics are editable native PowerPoint objects;
logos are embedded transparent images. Segoe UI matches the font fallback
used in the workshop decks.

Run from the repository root with desktop Microsoft PowerPoint on Windows:

```powershell
pwsh -NoProfile -File '.\campaigns\operation-lighthouse\certificates\build.ps1'
```

Rebuilding overwrites the three template outputs, not the existing workshop
decks. Close the certificate template before rebuilding it. The script preserves
other open presentations and uses the shared
[Office metadata helper](../presentations/office-metadata.ps1) to keep creator
and editor metadata branded.
