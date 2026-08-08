"""Deterministic validation of a proposed tool. Pure functions, no LLM.

Validation catches accidents and obvious hazards; the human activation step
is the security boundary. The threat model lives in docs/dynamic-tools.md.
"""

import re
from dataclasses import dataclass

from saaya.reflection.validate import CREDENTIAL_PATTERNS

NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,39}$")
ALLOWED_PARAM_TYPES = frozenset({"string", "number", "boolean"})
MAX_DESCRIPTION_CHARS = 500
MAX_SCRIPT_CHARS = 20_000
MAX_PARAMS = 8
REQUIRED_CONTRACT = "TOOL_INPUT"


@dataclass(frozen=True)
class ToolViolation:
    rule: str
    detail: str


def validate_tool(
    name: str, description: str, params: dict[str, str], script: str
) -> list[ToolViolation]:
    violations: list[ToolViolation] = []

    if not NAME_PATTERN.match(name):
        violations.append(
            ToolViolation("name", "lowercase letters, digits, underscores; 3-40 chars")
        )
    if not description.strip() or len(description) > MAX_DESCRIPTION_CHARS:
        violations.append(
            ToolViolation("description", f"required, at most {MAX_DESCRIPTION_CHARS} chars")
        )
    if len(params) > MAX_PARAMS:
        violations.append(ToolViolation("params", f"at most {MAX_PARAMS} parameters"))
    for param_name, param_type in params.items():
        if not NAME_PATTERN.match(param_name):
            violations.append(ToolViolation("params", f"bad parameter name {param_name!r}"))
        if param_type not in ALLOWED_PARAM_TYPES:
            violations.append(
                ToolViolation(
                    "params",
                    f"{param_name}: type must be one of {sorted(ALLOWED_PARAM_TYPES)}",
                )
            )

    if len(script) > MAX_SCRIPT_CHARS:
        violations.append(ToolViolation("script-size", f"over {MAX_SCRIPT_CHARS} chars"))
    if REQUIRED_CONTRACT not in script:
        violations.append(
            ToolViolation(
                "contract",
                "script must read the TOOL_INPUT environment variable for its input",
            )
        )
    try:
        compile(script, "<tool>", "exec")
    except SyntaxError as error:
        violations.append(ToolViolation("syntax", str(error)))

    for pattern in CREDENTIAL_PATTERNS:
        if pattern.search(script):
            violations.append(
                ToolViolation("credential", f"matches credential pattern {pattern.pattern!r}")
            )
            break

    return violations
