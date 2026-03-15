import re

with open('tests/unit/app.test.js', 'r') as f:
    content = f.read()

# Fix innerWidth logic
content = re.sub(
    r"app\.selectLocation\('1'\);\s*jest\.runAllTimers\(\);",
    r"app.selectLocation('1');\n        jest.runAllTimers();\n        window.innerWidth = 1000;\n",
    content
)

with open('tests/unit/app.test.js', 'w') as f:
    f.write(content)
