#!/usr/bin/env python3
"""
BudE Model Router v0.1
Routes tasks to optimal AI model
"""

import os
import requests

class ModelRouter:
    def __init__(self):
        self.groq_key = os.environ.get("GROQ_API_KEY", "")
        self.openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
        
    def route(self, task_type, prompt):
        """Select best model for task."""
        if task_type == "code":
            return self._groq("llama-3.3-70b-versatile", prompt)
        elif task_type == "reasoning":
            return self._openrouter("anthropic/claude-3.5-sonnet", prompt)
        elif task_type == "fast":
            return self._groq("llama-3.1-8b-instant", prompt)
        elif task_type == "chat":
            return self._groq("gemma2-9b-it", prompt)
        else:
            return self._groq("llama-3.3-70b-versatile", prompt)
    
    def _groq(self, model, prompt):
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.groq_key}"}
        payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 2048}
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        return resp.json()["choices"][0]["message"]["content"]
    
    def _openrouter(self, model, prompt):
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.openrouter_key}", "HTTP-Referer": "https://bude.ai"}
        payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        return resp.json()["choices"][0]["message"]["content"]

router = ModelRouter()
