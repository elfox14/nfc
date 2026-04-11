# Security Policy

## Supported Versions

Currently, only the `main` branch of this repository is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| v1.x.x  | :white_check_mark: |
| < v1.x  | :x:                |

## Reporting a Vulnerability

We request that you do NOT publicly disclose any security vulnerabilities until we have implemented a patch.

If you discover a security vulnerability within this project, please report it via one of the following methods:

1. **Private Vulnerability Reporting**: Use the GitHub "Security" tab and navigate to "Advisories" -> "Report a vulnerability" to open a confidential report.
2. **Email**: Send an email with details directly to the administrators of this repository.

Please provide as much information as possible, including:
- A description of the vulnerability.
- Steps to reproduce the issue.
- Potential impact.

We will acknowledge receipt of your vulnerability report within 48 hours and strive to send you regular updates about our progress.

## Secret Management
This repository strictly forbids committing credentials, tokens, or API keys. If you notice any secrets committed to the repository, please report them immediately. We use GitHub Secret Scanning to monitor and revoke keys.

## Dependency Security
We utilize `npm audit` in our CI/CD pipelines and depend on GitHub Dependabot to identify vulnerable packages. We expect contributors to resolve high or critical severity package alerts before merging Pull Requests.
