BLOCKED_WORDS = [
    "rm -rf",
    "delete all",
    "format",
    "destroy",
    "wipe"
]


def is_safe(text):
    text = text.lower()

    for b in BLOCKED_WORDS:
        if b in text:
            return False

    return True


def risk_level(change):
    if "brain.py" in change:
        return "medium"
    if "api" in change:
        return "low"
    return "low"
