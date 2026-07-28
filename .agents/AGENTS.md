# Workspace QA Testing Protocol

## Autonomous App Testing Directive
When the user asks to "Run QA test on [URL]" or "Check my app for bugs" (or similar QA testing request):
1. Execute the master test runner script:
   `./.venv/bin/python scripts/test_runner.py --url [URL]` (or `--url http://localhost:3000` if no URL is provided).
2. Once execution completes, read `qa_report.md` and present a clean summary of:
   - Features & routes tested (Pass / Fail)
   - Discovered JavaScript exceptions and network errors (4xx / 5xx)
   - Root cause analysis and suggested fixes.
