#!/usr/bin/env python3
"""Report L1 requirements that are not refined or linked to L2 designs.

By default this scans specs/L1 and compares the artifacts against
specs/traceability/l1_to_l2.md from the repository root inferred from this
script's location.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path


DEFAULT_REPO = Path(__file__).parent.parent
TRACEABILITY_PATH = Path("specs") / "traceability" / "l1_to_l2.md"
L1_ID_RE = re.compile(r"\bL1-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}\b")


@dataclass(frozen=True)
class L1Item:
    artifact_id: str
    path: Path
    title: str


@dataclass(frozen=True)
class TraceLink:
    source_id: str
    source_path: str
    target_id: str
    target_path: str
    relationship: str
    rationale: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find L1 requirements missing L2 traceability links."
    )
    parser.add_argument(
        "--repo",
        type=Path,
        default=DEFAULT_REPO,
        help="Repository root to scan. Default: parent of this script directory.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON instead of a text report.",
    )
    return parser.parse_args()


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise SystemExit(f"Missing required path: {path}") from None


def resolve_repo(path: Path) -> Path:
    expanded = path.expanduser()
    if expanded.is_absolute():
        return expanded.resolve()
    return (Path.cwd() / expanded).resolve()


def display_path(path: Path) -> str:
    try:
        relative = os.path.relpath(path, start=Path.cwd())
    except ValueError:
        return str(path)
    return "." if relative == "." else relative


def markdown_cells(line: str) -> list[str]:
    stripped = line.strip()
    if not stripped.startswith("|") or not stripped.endswith("|"):
        return []
    return [cell.strip() for cell in stripped.strip("|").split("|")]


def extract_title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped.lstrip("#").strip()
    return fallback


def extract_l1_id(path: Path, text: str) -> str | None:
    artifact_match = re.search(r"(?m)^artifact_id:\s*(L1-[A-Z0-9-]+)\s*$", text)
    if artifact_match:
        return artifact_match.group(1)

    filename_match = L1_ID_RE.search(path.name)
    if filename_match:
        return filename_match.group(0)

    text_match = L1_ID_RE.search(text)
    if text_match:
        return text_match.group(0)

    return None


def collect_l1_items(repo: Path) -> dict[str, L1Item]:
    l1_dir = repo / "specs" / "L1"
    if not l1_dir.is_dir():
        raise SystemExit(f"Missing L1 directory: {l1_dir}")

    items: dict[str, L1Item] = {}
    duplicate_ids: dict[str, list[Path]] = {}

    for path in sorted(l1_dir.glob("*.md")):
        text = read_text(path)
        artifact_id = extract_l1_id(path, text)
        if artifact_id is None:
            print(f"warning: could not identify L1 artifact id in {path}", file=sys.stderr)
            continue

        if artifact_id in items:
            duplicate_ids.setdefault(artifact_id, [items[artifact_id].path]).append(path)
            continue

        items[artifact_id] = L1Item(
            artifact_id=artifact_id,
            path=path.relative_to(repo),
            title=extract_title(text, fallback=path.stem),
        )

    if duplicate_ids:
        details = "\n".join(
            f"  {artifact_id}: {', '.join(str(p) for p in paths)}"
            for artifact_id, paths in duplicate_ids.items()
        )
        raise SystemExit(f"Duplicate L1 artifact ids found:\n{details}")

    return items


def collect_trace_links(repo: Path) -> list[TraceLink]:
    matrix_path = repo / TRACEABILITY_PATH
    text = read_text(matrix_path)
    links: list[TraceLink] = []

    for line in text.splitlines():
        cells = markdown_cells(line)
        if len(cells) != 6:
            continue

        source_id, source_path, target_id, target_path, relationship, rationale = cells
        if source_id == "Source ID" or set(source_id) <= {"-"}:
            continue
        if not source_id.startswith("L1-"):
            continue
        if not target_id.startswith("L2-"):
            continue

        links.append(
            TraceLink(
                source_id=source_id,
                source_path=source_path,
                target_id=target_id,
                target_path=target_path,
                relationship=relationship,
                rationale=rationale,
            )
        )

    return links


def item_to_dict(item: L1Item) -> dict[str, str]:
    return {
        "artifact_id": item.artifact_id,
        "path": str(item.path),
        "title": item.title,
    }


def link_to_dict(link: TraceLink) -> dict[str, str]:
    return {
        "source_id": link.source_id,
        "source_path": link.source_path,
        "target_id": link.target_id,
        "target_path": link.target_path,
        "relationship": link.relationship,
        "rationale": link.rationale,
    }


def print_item_list(title: str, items: list[L1Item]) -> None:
    print(f"\n{title} ({len(items)})")
    print("-" * len(f"{title} ({len(items)})"))
    if not items:
        print("None")
        return

    for item in items:
        print(f"- {item.artifact_id} | {item.path} | {item.title}")


def print_linked_only_related(items: list[L1Item], links_by_source: dict[str, list[TraceLink]]) -> None:
    title = "Linked to L2 but not refined-by"
    print(f"\n{title} ({len(items)})")
    print("-" * len(f"{title} ({len(items)})"))
    if not items:
        print("None")
        return

    for item in items:
        links = links_by_source[item.artifact_id]
        target_summary = ", ".join(
            f"{link.target_id} ({link.relationship})" for link in links
        )
        print(f"- {item.artifact_id} | {item.path} | {target_summary}")


def main() -> int:
    args = parse_args()
    repo = resolve_repo(args.repo)
    repo_display = display_path(repo)

    l1_items = collect_l1_items(repo)
    trace_links = collect_trace_links(repo)

    links_by_source: dict[str, list[TraceLink]] = {}
    for link in trace_links:
        links_by_source.setdefault(link.source_id, []).append(link)

    unlinked = [
        item
        for artifact_id, item in sorted(l1_items.items())
        if artifact_id not in links_by_source
    ]
    linked_not_refined = [
        item
        for artifact_id, item in sorted(l1_items.items())
        if artifact_id in links_by_source
        and not any(
            link.relationship == "refined-by" for link in links_by_source[artifact_id]
        )
    ]
    refined = [
        item
        for artifact_id, item in sorted(l1_items.items())
        if any(link.relationship == "refined-by" for link in links_by_source.get(artifact_id, []))
    ]
    stale_trace_sources = sorted(
        source_id for source_id in links_by_source if source_id not in l1_items
    )

    if args.json:
        payload = {
            "repo": repo_display,
            "traceability_path": str(TRACEABILITY_PATH),
            "counts": {
                "l1_total": len(l1_items),
                "refined": len(refined),
                "linked_not_refined": len(linked_not_refined),
                "unlinked": len(unlinked),
                "stale_trace_sources": len(stale_trace_sources),
            },
            "unlinked": [item_to_dict(item) for item in unlinked],
            "linked_not_refined": [
                {
                    **item_to_dict(item),
                    "links": [
                        link_to_dict(link) for link in links_by_source[item.artifact_id]
                    ],
                }
                for item in linked_not_refined
            ],
            "stale_trace_sources": stale_trace_sources,
        }
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 0

    print("L1 to L2 Traceability Gap Report")
    print(f"Repository: {repo_display}")
    print(f"Traceability matrix: {TRACEABILITY_PATH}")
    print()
    print(f"L1 total: {len(l1_items)}")
    print(f"Refined by at least one L2 item: {len(refined)}")
    print(f"Linked to L2 but not refined-by: {len(linked_not_refined)}")
    print(f"No L2 link: {len(unlinked)}")
    print(f"Trace rows pointing at missing L1 IDs: {len(stale_trace_sources)}")

    print_item_list("No L2 link", unlinked)
    print_linked_only_related(linked_not_refined, links_by_source)

    if stale_trace_sources:
        print("\nTrace rows pointing at missing L1 IDs")
        print("-------------------------------------")
        for source_id in stale_trace_sources:
            print(f"- {source_id}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
