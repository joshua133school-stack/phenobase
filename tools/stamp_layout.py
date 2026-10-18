#!/usr/bin/env python3
"""Stamp the shared masthead, menu and footer into every HTML page.

Each page contains the markers

    <!--#masthead--> ... <!--/masthead-->
    <!--#footer--> ... <!--/footer-->

and everything between them is replaced. Edit MENU / templates here, then run:

    python3 tools/stamp_layout.py
"""

import datetime as dt
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RELEASE = "0.1 (prototype)"
REPO = "https://github.com/joshua133school-stack/phenobase"

MENU = [
    ("index.html", "Home"),
    ("search.html", "Search records"),
    ("crops.html", "Crops"),
    ("stages.html", "Stage codes"),
    ("guidelines/index.html", "Farmer guidelines"),
    ("submit.html", "Submit observations"),
    ("data.html", "Data &amp; standards"),
    ("about.html", "About"),
]

GUIDE_LANGS = [("en.html", "English"), ("ko.html", "한국어"), ("ja.html", "日本語"), ("zh-hans.html", "简体中文")]

MASTHEAD = """<!--#masthead-->
<div id="masthead">
<div class="name"><a href="{p}index.html">PhenoBase</a></div>
<div class="tagline">Asian Farmer Phenology Database &middot; Fruit and Field Crops
<span class="cjk">&middot; 아시아 농업인 작물 생물계절 데이터베이스 &middot; アジア農業者作物フェノロジーDB &middot; 亚洲农民作物物候数据库</span></div>
</div>
<div id="menu">{menu}</div>
<!--/masthead-->"""

FOOTER = """<!--#footer-->
<div id="footer">
PhenoBase release {release} &middot; Page updated {date} &middot;
<a href="{p}data.html#license">Licence &amp; citation</a> &middot;
<a href="{p}about.html#contact">Contact</a> &middot;
<a href="{repo}/issues">Report a problem</a> &middot;
Guidelines: {langs}
</div>
<!--/footer-->"""


def page_key(path):
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith("guidelines/"):
        return "guidelines/index.html"
    if rel == "record.html":
        return "search.html"
    return rel


def stamp(path, today):
    rel = path.relative_to(ROOT)
    p = "../" * (len(rel.parts) - 1)
    here = page_key(path)
    links = []
    for href, label in MENU:
        cls = ' class="here"' if href == here else ""
        links.append('<a href="%s%s"%s>%s</a>' % (p, href, cls, label))
    menu = '<span class="sep">|</span>'.join(links)
    langs = " | ".join('<a href="%sguidelines/%s">%s</a>' % (p, f, n) for f, n in GUIDE_LANGS)

    text = path.read_text(encoding="utf-8")
    new = re.sub(r"<!--#masthead-->.*?<!--/masthead-->",
                 lambda m: MASTHEAD.format(p=p, menu=menu), text, flags=re.S)
    new = re.sub(r"<!--#footer-->.*?<!--/footer-->",
                 lambda m: FOOTER.format(p=p, release=RELEASE, date=today, repo=REPO, langs=langs),
                 new, flags=re.S)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def main():
    today = dt.date.today().isoformat()
    pages = sorted(ROOT.glob("*.html")) + sorted((ROOT / "guidelines").glob("*.html"))
    for page in pages:
        changed = stamp(page, today)
        print(("stamped  " if changed else "unchanged ") + page.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
