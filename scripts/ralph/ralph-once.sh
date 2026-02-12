#!/bin/bash

claude --permission-mode bypassPermissions "@prompt.md @.claude/agents.md @tasks.md \
1. Choose the next task from tasks.md and the prompt.md file to understand your context. Utilize the agents file to understand helpful tips you've discovered before. \
2. Find the next incomplete task and implement it. \
3. Commit your changes. \
4. Update .claude/agents.md with your learnings and findings (see @prompt.md for good conventions). \
5. Update the prd.json file in the task folder to reflect the completed task. \
6. Update @tasks.md with the status of the task you just completed. \
7. Commit your changes as well as any outstanding changes (such as scripts or markdown files). \
8. Merge your changes into the 'master' branch. \
ONLY DO ONE TASK AT A TIME."
