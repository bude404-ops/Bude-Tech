#!/usr/bin/env python3
"""
BudE Code Sandbox v0.1
Tests code before committing
"""

import subprocess
import tempfile
import os
import sys

class Sandbox:
    def __init__(self):
        self.test_results = []
    
    def test_python(self, code, filename="test.py"):
        """Test Python code in isolated environment."""
        try:
            # Write to temp file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_path = f.name
            
            # Run with timeout
            result = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True,
                text=True,
                timeout=10,
                env={**os.environ, "PYTHONPATH": ""}  # Isolated
            )
            
            os.unlink(temp_path)
            
            success = result.returncode == 0
            self.test_results.append({
                "file": filename,
                "success": success,
                "output": result.stdout if success else result.stderr,
                "timestamp": __import__('datetime').datetime.utcnow().isoformat()
            })
            
            return success, result.stdout if success else result.stderr
            
        except subprocess.TimeoutExpired:
            return False, "Execution timeout (10s)"
        except Exception as e:
            return False, str(e)
    
    def test_syntax(self, code):
        """Quick syntax check."""
        try:
            compile(code, '<string>', 'exec')
            return True, "Syntax OK"
        except SyntaxError as e:
            return False, f"Syntax error: {e}"
    
    def validate_file(self, path, content):
        """Full validation before writing."""
        # Syntax check
        ok, msg = self.test_syntax(content)
        if not ok:
            return False, f"Syntax check failed: {msg}"
        
        # If Python, try execution
        if path.endswith('.py'):
            ok, msg = self.test_python(content, path)
            if not ok:
                return False, f"Execution failed: {msg}"
        
        return True, "All checks passed"

sandbox = Sandbox()
