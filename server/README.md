## Developments
### From UV
**Exporting from `pyproject.toml` or `uv.lock` (recommended)**
```bash
uv pip compile pyproject.toml -o requirements.txt
```

**Freezing the current environment**
```bash
uv pip freeze > requirements.txt
```

### From Python
**Importing from requirements.txt**
```bash
pip install -r requirements.txt
```
