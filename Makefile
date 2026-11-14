.PHONY: install test lint demo build check clean

install:
	python -m pip install -e ".[dev]"

test:
	python -m pytest

lint:
	ruff check src tests examples scripts

demo:
	python -m pcb_design demo --out-dir demo-output

build:
	python -m build

check:
	python -m twine check dist/*

clean:
	rm -rf build dist .pytest_cache .ruff_cache htmlcov .coverage
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
