"""Tool validation rules. Hermetic and exhaustive per rule."""

from saaya.tools.validation import validate_tool

GOOD_SCRIPT = """import json, os
params = json.loads(os.environ["TOOL_INPUT"])
print(params["text"][::-1])
"""


def _rules(
    name: str = "reverse_text",
    description: str = "Reverses text.",
    params: dict[str, str] | None = None,
    script: str = GOOD_SCRIPT,
) -> list[str]:
    resolved = params if params is not None else {"text": "string"}
    return [v.rule for v in validate_tool(name, description, resolved, script)]


def test_a_clean_tool_passes() -> None:
    assert _rules() == []


def test_name_rules() -> None:
    assert "name" in _rules(name="BadName")
    assert "name" in _rules(name="x")
    assert "name" in _rules(name="has-dash")


def test_description_required_and_bounded() -> None:
    assert "description" in _rules(description="  ")
    assert "description" in _rules(description="x" * 501)


def test_param_names_and_types() -> None:
    assert "params" in _rules(params={"Bad": "string"})
    assert "params" in _rules(params={"text": "object"})
    assert "params" in _rules(params={f"p{i}": "string" for i in range(9)})


def test_script_contract_and_syntax() -> None:
    assert "contract" in _rules(script="print('no input read')")
    assert "syntax" in _rules(script="def broken(:\n  pass\n# TOOL_INPUT")
    assert "script-size" in _rules(script="# TOOL_INPUT\n" + "x = 1\n" * 20000)


def test_credential_patterns_are_blocked() -> None:
    leaky = GOOD_SCRIPT + "\nkey = 'sk-abc12345678'\n"
    assert "credential" in _rules(script=leaky)
