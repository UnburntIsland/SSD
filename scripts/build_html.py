#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Assemble the single-file index.html by injecting generated assets + island
data into src/index.template.html. Run after gen_assets.py."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def main():
    tpl_path = os.path.join(ROOT, "src", "index.template.html")
    with open(tpl_path, encoding="utf-8") as f:
        tpl = f.read()
    with open(os.path.join(ROOT, "build", "assets_b64.json"), encoding="utf-8") as f:
        a = json.load(f)
    with open(os.path.join(ROOT, "build", "island.json"), encoding="utf-8") as f:
        island = json.load(f)

    data = {"meta": a["meta"], "img": a["img"], "island": island}
    blob = json.dumps(data, separators=(",", ":"), ensure_ascii=False)

    if "__GAME_DATA__" not in tpl:
        raise SystemExit("ERROR: placeholder __GAME_DATA__ not found in template")
    out = tpl.replace("__GAME_DATA__", blob)

    out_path = os.path.join(ROOT, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(out)

    sentinel_ok = out.rstrip().endswith("<!-- END_OF_GAME -->")
    print(f"index.html bytes: {len(out)}")
    print(f"placeholder replaced: {'__GAME_DATA__' not in out}")
    print(f"template bytes: {len(tpl)}  data blob bytes: {len(blob)}")
    print(f"end sentinel present: {sentinel_ok}")

if __name__ == "__main__":
    main()
