import subprocess
import sys

steps = [
    ["ruff", "check", "--fix", "."],
    ["ruff", "format", "."],
    ["mypy", "."],
]

for cmd in steps:
    if subprocess.run(cmd).returncode != 0:
        sys.exit(1)
