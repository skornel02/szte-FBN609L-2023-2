import os
import nbformat
from nbconvert import MarkdownExporter

# read all files ending with .ipynb
notebooks = [f for f in os.listdir('.') if f.endswith('.ipynb')]

# create a Markdown exporter
exporter = MarkdownExporter()

# process each notebook
for notebook in notebooks:
    print(f"Processing {notebook}...")
    # read the notebook
    with open(notebook, 'r') as f:
        nb = nbformat.read(f, as_version=4)
    # export to markdown
    body, resources = exporter.from_notebook_node(nb)

    # replace `![png](NAME.png)` with `![png](./{notebook}/NAME.png)` in body
    for name, data in resources['outputs'].items():
        body = body.replace(f"![png]({name})", f"![png](./{notebook.replace('.ipynb', '')}/{name})")

    # write to a new file
    with open("website/src/notebooks/" + notebook.replace('.ipynb', '.md'), 'w') as f:
        f.write(body)

    # create a directory for the images
    os.makedirs(f"website/src/notebooks/{notebook.replace('.ipynb', '')}", exist_ok=True)

    # export images
    for name, data in resources['outputs'].items():
        with open(f"website/src/notebooks/{notebook.replace('.ipynb', '')}/{name}", 'wb') as f:
            f.write(data)
