def run_test(change):
    """
    SAFE SIMULATION LAYER
    We DO NOT execute real system writes here.
    """

    if "delete" in change.lower():
        return False, "Unsafe: delete operation blocked"

    if "brain.py" in change:
        return True, "Brain modification accepted in sandbox"

    return True, "Change looks safe"
