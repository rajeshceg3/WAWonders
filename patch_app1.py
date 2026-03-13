import re

with open('src/app.js', 'r') as f:
    content = f.read()

# Modify selectLocation to set body[data-biome]
content = re.sub(
    r"this\.showDetailView\(location, biome\);",
    r"this.showDetailView(location, biome);\n        document.body.setAttribute('data-biome', biome);",
    content
)

# Modify showListView to remove body[data-biome]
content = re.sub(
    r"this\.detailView\.classList\.remove\('visible'\);",
    r"this.detailView.classList.remove('visible');\n        document.body.removeAttribute('data-biome');",
    content
)

with open('src/app.js', 'w') as f:
    f.write(content)
