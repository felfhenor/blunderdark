#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./ralph.sh [--tool amp|claude] [max_iterations]

set -e

# Parse arguments
TOOL="claude"  # Default to claude
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'claude'."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  # Create a temp file for capturing output
  TEMP_OUTPUT=$(mktemp)

  # Run the claude command directly with the autonomous task instructions
  # Use tee to both display and capture output
  (cd "$SCRIPT_DIR" && claude --permission-mode bypassPermissions "@progress.txt @prompt.md @AGENTS.md @tasks.md \
1. Choose the next task from tasks.md and read the progress file and the prompt file to understand your context. Utilize the agents file to understand helpful tips you've discovered before. \
2. Find the next incomplete task and implement it. \
3. Commit your changes. \
4. Update progress.txt with what you did. \
5. Update @AGENTS.md with your learnings and findings (see @prompt.md for good conventions). \
6. Update the prd.json file in the task folder to reflect the completed task. \
7. Update tasks.md with the status of the task you just completed. \
8. Commit your changes. \
ONLY DO ONE TASK AT A TIME." 2>&1) | tee "$TEMP_OUTPUT" || true

  # Check for completion signal
  if grep -q "<promise>COMPLETE</promise>" "$TEMP_OUTPUT"; then
    rm -f "$TEMP_OUTPUT"
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi

  rm -f "$TEMP_OUTPUT"
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
