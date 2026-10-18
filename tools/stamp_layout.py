#!/usr/bin/env python3
"""Stamp the shared header, footer and guideline language bar into every HTML page.

Markers (everything between them is replaced):

    <!--#masthead--> ... <!--/masthead-->
    <!--#footer--> ... <!--/footer-->
    <!--#langbar--> ... <!--/langbar-->     (guideline documents only)

Edit MENU / SECTION_OF here, then run:

    python3 tools/stamp_layout.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RELEASE = "0.1 (prototype)"
REPO = "https://github.com/joshua133school-stack/phenobase"

# main menu: (section key, landing page, label, sub-pages)
MENU = [
    ("about", "about.html", "About", []),
    ("howto", "how-to.html", "How to Use",
     [("how-to.html", "Overview"), ("guidelines/index.html", "Guideline"),
      ("stages.html", "Stage codes"), ("submit.html", "Submit")]),
    ("db", "index.html", "PhenoBase",
     [("index.html", "Overview"), ("search.html", "Search"),
      ("crops.html", "Crops"), ("data.html", "Data")]),
]

# page -> (section, sub-page it belongs under)
SECTION_OF = {
    "about.html": ("about", None),
    "how-to.html": ("howto", "how-to.html"),
    "stages.html": ("howto", "stages.html"),
    "submit.html": ("howto", "submit.html"),
    "index.html": ("db", "index.html"),
    "search.html": ("db", "search.html"),
    "record.html": ("db", "search.html"),
    "crops.html": ("db", "crops.html"),
    "data.html": ("db", "data.html"),
}

GUIDE_LANGS = [("en.html", "English"), ("ko.html", "한국어"), ("ja.html", "日本語"), ("zh-hans.html", "简体中文")]


def section(rel):
    if rel.startswith("guidelines/"):
        return ("howto", "guidelines/index.html")
    return SECTION_OF.get(rel, (None, None))


def masthead(p, rel):
    sec, sub = section(rel)
    buttons, subnav = [], ""
    for key, href, label, subs in MENU:
        cls = ' class="here"' if key == sec else ""
        buttons.append('<a href="%s%s"%s>%s</a>' % (p, href, cls, label))
        if key == sec and subs:
            subnav = '\n<div id="sub">' + " ".join(
                ('<b>%s</b>' % l) if h == sub else '<a href="%s%s">%s</a>' % (p, h, l) for h, l in subs) + "</div>"
    return ('<!--#masthead-->\n<div id="masthead">\n'
            '<a class="name" href="%sindex.html">PhenoBase</a>\n'
            '<span class="tagline">Asian Farmer Phenology Database</span>\n'
            '<div id="menu">%s</div>\n</div>%s\n<!--/masthead-->') % (p, "".join(buttons), subnav)


def footer(p):
    return ('<!--#footer-->\n<div id="footer">PhenoBase %s &middot; '
            '<a href="%sdata.html#license">Licence</a> &middot; '
            '<a href="%s/issues">Contact</a></div>\n<!--/footer-->') % (RELEASE, p, REPO)


def langbar(rel):
    name = rel.split("/")[-1]
    return "<!--#langbar-->\n<p class=\"small noprint\">" + " | ".join(
        ("<b>%s</b>" % n) if f == name else '<a href="%s">%s</a>' % (f, n) for f, n in GUIDE_LANGS) + "</p>\n<!--/langbar-->"


def stamp(path):
    rel = path.relative_to(ROOT).as_posix()
    p = "../" * rel.count("/")
    text = path.read_text(encoding="utf-8")
    new = re.sub(r"<!--#masthead-->.*?<!--/masthead-->", lambda m: masthead(p, rel), text, flags=re.S)
    new = re.sub(r"<!--#footer-->.*?<!--/footer-->", lambda m: footer(p), new, flags=re.S)
    new = re.sub(r"<!--#langbar-->.*?<!--/langbar-->", lambda m: langbar(rel), new, flags=re.S)
    if new != text:
        path.write_text(new, encoding="utf-8")
    return new != text


def main():
    for page in sorted(ROOT.glob("*.html")) + sorted((ROOT / "guidelines").glob("*.html")):
        print(("stamped   " if stamp(page) else "unchanged ") + page.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
