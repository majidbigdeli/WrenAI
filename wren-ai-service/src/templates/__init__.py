from __future__ import annotations

from pathlib import Path

TEMPLATE_DIR = Path(__file__).resolve().parent


def load_template(relative_path: str) -> str:
    """Load a text template from the templates directory."""
    template_path = TEMPLATE_DIR / relative_path
    return template_path.read_text(encoding="utf-8")


def render_template(relative_path: str, **replacements: str) -> str:
    """Load a text template and replace placeholders of the form {{key}}."""
    content = load_template(relative_path)
    for key, value in replacements.items():
        content = content.replace(f"{{{{{key}}}}}", value)
    return content
