import re

with open('src/app.js', 'r') as f:
    content = f.read()

# Modify addLocation to add 3D interaction logic
injection = """        // Bi-directional Highlighting
        // 1. Hover List Item -> Highlight Marker
        li.addEventListener('mouseenter', () => {
            this.soundManager.playHoverSound();
            this.setHighlight(location.id, true);
        });
        li.addEventListener('mousemove', (e) => {
            const rect = li.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            // Max rotation is 5deg
            const maxRotate = 5;
            const rotateX = (y / (rect.height / 2)) * -maxRotate;
            const rotateY = (x / (rect.width / 2)) * maxRotate;

            li.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
        li.addEventListener('mouseleave', () => {
            li.style.transform = '';
            this.setHighlight(location.id, false);
        });"""

content = re.sub(
    r"\s*// Bi-directional Highlighting\s*// 1\. Hover List Item -> Highlight Marker\s*li\.addEventListener\('mouseenter', \(\) => \{\s*this\.soundManager\.playHoverSound\(\);\s*this\.setHighlight\(location\.id, true\);\s*\}\);\s*li\.addEventListener\('mouseleave', \(\) => \{\s*this\.setHighlight\(location\.id, false\);\s*\}\);",
    injection,
    content,
    flags=re.MULTILINE
)

with open('src/app.js', 'w') as f:
    f.write(content)
