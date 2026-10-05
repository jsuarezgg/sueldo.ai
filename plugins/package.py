"""Check the bounded submission package and create a reproducible draft ZIP.

Run from the repository root: python3 plugins/package.py
No network calls, installs, publisher verification or submission.
"""

import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "plugins" / "sueldo-ai"
FILES = ("plugin.json", "mcp.json", "assets/icon.svg", "LICENSE")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def bounded_text(value, maximum):
    return isinstance(value, str) and 0 < len(value.strip()) <= maximum and len(value) <= maximum


def main():
    for name in FILES:
        path = PACKAGE / name
        require(path.is_file() and not path.is_symlink(), f"Missing or linked package file: {name}")
        require(path.resolve().is_relative_to(PACKAGE.resolve()), f"Path escapes package: {name}")
    # Never silently upload extra files, credentials, local overrides or research.
    actual = {str(path.relative_to(PACKAGE)) for path in PACKAGE.rglob("*") if path.is_file()}
    require(actual == set(FILES), f"Unexpected package contents: {actual.symmetric_difference(FILES)}")
    manifest = json.loads((PACKAGE / "plugin.json").read_text())
    require(manifest.get("$schema") == "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", "Wrong portable manifest schema")
    require(manifest.get("name") == "sueldo-ai", "Unexpected package identity")
    require(re.fullmatch(r"\d+\.\d+\.\d+", manifest.get("version", "")), "Use a numeric semantic version")
    require(bounded_text(manifest.get("description"), 4000), "Invalid package description")
    require(manifest.get("license") == "SEE LICENSE IN LICENSE", "Preserve proprietary licensing")
    require((PACKAGE / "LICENSE").read_bytes() == (ROOT / "LICENSE").read_bytes(), "Package license differs from repository license")
    extension = manifest["extensions"]["com.openai"]
    interface = extension["interface"]
    for field, limit in [("displayName", 30), ("shortDescription", 30), ("longDescription", 4000), ("developerName", 80)]:
        require(bounded_text(interface.get(field), limit), f"Invalid {field}")
    require(interface.get("category") == "Finance", "Confirm category against the submission dashboard")
    for field in ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]:
        url = urlsplit(interface.get(field, ""))
        require(url.scheme == "https" and url.hostname and not url.username and not url.password and len(url.geturl()) <= 1024, f"Invalid {field}")
    prompts = interface["defaultPrompt"]
    require(isinstance(prompts, list) and 1 <= len(prompts) <= 3 and len(set(prompts)) == len(prompts), "Use up to three unique prompts")
    require(all(bounded_text(prompt, 128) and "@" not in prompt for prompt in prompts), "Invalid starter prompt")
    capabilities = interface["capabilities"]
    require(isinstance(capabilities, list) and len(capabilities) <= 20 and all(bounded_text(c, 120) for c in capabilities), "Invalid capabilities")
    for field in ["logo", "composerIcon"]:
        require(interface.get(field) == "./assets/icon.svg", f"Unexpected {field}")
    icon = PACKAGE / "assets/icon.svg"
    require(icon.stat().st_size <= 5 * 1024 * 1024, "Icon too large")
    box = [float(part) for part in ET.parse(icon).getroot().attrib["viewBox"].split()]
    require(len(box) == 4 and box[2] == box[3] and box[2] >= 48, "Icon must be square and at least 48 units")
    translation = extension["publication"]["translations"]["es-MX"]
    require(bounded_text(translation["subtitle"], 30) and bounded_text(translation["description"], 4000), "Invalid Spanish translation")
    require(extension["publication"]["countries"] == ["MX"], "Initial availability is Mexico")
    mcp = json.loads((PACKAGE / "mcp.json").read_text())
    require(mcp == {"$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", "mcpServers": {"sueldo": {"type": "streamable-http", "url": "https://sueldo.ai/api/mcp"}}}, "Unexpected MCP wiring, auth or transport")
    cases = extension["review"]["test_cases"]
    for kind, count in [("positive", 5), ("negative", 3)]:
        require(len(cases[kind]) == count, f"Expected {count} {kind} review cases")
        for case in cases[kind]:
            require(all(bounded_text(case.get(field), 4000) for field in ["description", "prompt", "expected_behavior"]), "Incomplete review case")
            if kind == "positive":
                require(case.get("tools_triggered") == "compare_offers", "Unexpected review tool")

    output = ROOT / "app/output" / f"sueldo-ai-{manifest['version']}-draft.zip"
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for name in FILES:
            info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, (PACKAGE / name).read_bytes())
    with ZipFile(output) as archive:
        require(archive.testzip() is None and archive.namelist() == list(FILES), "Archive check failed")
    print(f"Draft package: {output}\nSHA-256: {hashlib.sha256(output.read_bytes()).hexdigest()}")
    print("Local package checks passed. Not submitted or approved; complete plugins/README.md launch gates.")


if __name__ == "__main__":
    main()
