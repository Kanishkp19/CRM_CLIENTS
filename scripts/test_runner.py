import argparse
import asyncio
import os
from langchain_openai import ChatOpenAI
from browser_use import Agent, Browser, BrowserProfile

async def main():
    parser = argparse.ArgumentParser(description="Autonomous Web App QA Test Runner")
    parser.add_argument("--url", default="http://localhost:3000", help="Target URL to run QA tests against")
    args = parser.parse_args()

    target_url = args.url
    print(f"Starting autonomous QA testing against target URL: {target_url}")

    task_prompt = f"""
    You are an expert QA Automation Engineer.
    Perform an autonomous, end-to-end exploration and testing session on the web application at target URL: {target_url}

    Your testing objectives:
    1. Navigate to {target_url}.
    2. Map out all primary routes and navigation links across the app.
    3. Test all key interactive elements, buttons, inputs, and forms (submit realistic test data where applicable).
    4. Check for broken links, UI rendering errors, or unhandled errors.
    5. Monitor browser behavior, console logs, JS exceptions, and failing network HTTP requests (4xx/5xx).

    Final Output Requirement:
    Compile and output a detailed Markdown QA Report saved to 'qa_report.md'. The report MUST contain:
    - Executive Summary & Overall Pass/Fail status
    - Routes & Features Tested (with status PASS or FAIL for each)
    - Browser Console Errors & Unhandled JS Exceptions encountered
    - Failed Network Requests (HTTP 4xx / 5xx responses)
    - Root-cause analysis explaining potential reasons for any observed failures or broken flows.
    """

    llm = ChatOpenAI(model="gpt-4o", temperature=0)

    # Initialize browser configuration if custom options are needed
    config = BrowserProfile(
        headless=False,
    )
    browser = Browser(config=config)

    agent = Agent(
        task=task_prompt,
        llm=llm,
        browser=browser,
    )

    result = await agent.run()

    # Write output to qa_report.md
    with open("qa_report.md", "w", encoding="utf-8") as f:
        f.write(f"# QA Test Report - {target_url}\n\n")
        f.write(str(result))

    print("QA Test completed successfully. Report saved to qa_report.md.")

if __name__ == "__main__":
    asyncio.run(main())
