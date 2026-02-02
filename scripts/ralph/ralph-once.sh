#!/bin/bash

claude --permission-mode acceptEdits "@progress.txt \
1. Choose a PRD and read the progress file. \
2. Find the next incomplete task and implement it. \
3. Commit your changes. \
4. Update progress.txt with what you did. \
5. Update the prd.json file in the task folder to reflect the completed task. \
ONLY DO ONE TASK AT A TIME."
