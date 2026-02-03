#!/bin/bash

claude --permission-mode bypassPermissions "@progress.txt @prompt.md \
1. Choose a task PRD and read the progress file and the prompt file to understand your context. \
2. Find the next incomplete task and implement it. \
3. Commit your changes. \
4. Update progress.txt with what you did. \
5. Update AGENTS.md with your learnings and findings (see @prompt.md for good conventions). \
6. Update the prd.json file in the task folder to reflect the completed task. \
7. Commit your changes. \
ONLY DO ONE TASK AT A TIME."
