import random

def generate_content():
    # Generate a random blog post
    title = f"BudE Update {random.randint(1, 100)}"
    content = f"This is a random blog post about BudE."
    return title, content

generated_title, generated_content = generate_content()
print(generated_title)
print(generated_content)