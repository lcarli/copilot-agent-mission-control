# Security Policy

## Supported versions

The project is currently pre-release.

| Version | Security support |
|---|---|
| Latest commit on `main` | Supported |
| Open feature branches and pull requests | Not deployed or supported |
| Historical commits and untagged snapshots | Not supported |

After public releases begin, this table will identify supported release lines.
Security fixes may require upgrading to the latest supported version.

## Report a vulnerability privately

Do not open a public issue, discussion, or pull request for a suspected
vulnerability.

Use GitHub private vulnerability reporting:

1. Open the repository **Security** tab.
2. Select **Advisories**.
3. Select **Report a vulnerability**.
4. Provide the affected component and version, impact, reproduction steps,
   prerequisites, and any suggested mitigation.

Do not include real credentials, personal data, participant source code, or
confidential customer or event information. Use synthetic identifiers and
redacted evidence.

If private vulnerability reporting is unavailable, contact the repository
owner privately through GitHub before sharing technical details. Public reports
will be closed and moved to a private channel where possible.

## What to report

Examples include:

- Cross-event or cross-unit authorization bypass.
- Instructor command execution without instructor authorization.
- Token, event code, secret, or credential exposure.
- Campaign archive path traversal or unsafe file extraction.
- Stored or reflected script injection in the dashboard or public display.
- Public projection disclosure of private unit data.
- Submission, validator, or score idempotency failures that can change results.
- Unsafe deserialization, command injection, or arbitrary code execution.
- Material denial-of-service paths that bypass documented limits.
- Vulnerable deployment defaults or excessive Azure permissions.

General bugs without a confidentiality, integrity, or availability impact
belong in the normal issue tracker.

## Research and testing boundaries

Good-faith research must:

- Use resources and event sessions you own or have explicit permission to test.
- Use synthetic data and test accounts.
- Stop when you confirm a vulnerability or encounter data that is not yours.
- Avoid persistence, destructive actions, lateral movement, social engineering,
  physical attacks, service disruption, and high-volume automated scanning.
- Avoid accessing, modifying, downloading, or retaining another person's data.
- Give maintainers reasonable time to investigate and release a fix before
  public disclosure.

This policy does not authorize testing Microsoft, GitHub, Azure, event venues,
or other third-party systems outside this repository's deployed application.
Follow each provider's security policy for third-party findings.

## Response process

Maintainers aim to:

- Acknowledge a complete report within three business days.
- Provide an initial severity and scope assessment within seven business days.
- Send progress updates at least every ten business days while remediation is
  active.
- Coordinate a release and disclosure timeline based on severity and user risk.

These are targets, not guarantees. Complex reports or maintainer availability
may change the timeline.

The project uses severity, exploitability, affected data, required privileges,
and event impact to prioritize remediation. Maintainers may request additional
reproduction details, create a private fork, prepare a coordinated patch, and
credit the reporter with permission.

## Disclosure and fixes

Security fixes should include:

- A regression test when practical.
- A review of related authorization and isolation paths.
- Updated deployment or operational guidance when configuration contributes to
  the issue.
- A GitHub Security Advisory and CVE when appropriate.
- Clear upgrade or mitigation instructions.

Never commit exploit details, live secrets, or identifying event data to the
repository.
