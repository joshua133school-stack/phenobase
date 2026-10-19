#!/usr/bin/env python3
"""Build the static data files used by the phenorelay website.

  data/reference.json  (hand-edited source)  ->  data/reference.js
  DEMO_PROGRAMS below   (synthetic)           ->  data/observations.csv
                                                  data/observations.js

The observation records produced here are SYNTHETIC DEMONSTRATION DATA.
They exist only so the query, record and export pages can be tested before
real farmer observations are collected. Every record carries
status = "DEMO". Replace this generator with an import of real data
before any public release.

Usage:  python3 tools/build_data.py
"""

import csv
import datetime as dt
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

FIRST_YEAR = 2017
CUTOFF = dt.date(2026, 10, 18)  # no records after the build date
SEED = 20261018

# site_id, country, admin1, locality, lat, lon, elevation_m, first_year
SITES = [
    ("KR-AND-01", "KR", "Gyeongsangbuk-do", "Andong",            36.57, 128.73,  140, 2017),
    ("KR-NAJ-01", "KR", "Jeollanam-do",     "Naju",              35.02, 126.71,   30, 2017),
    ("KR-YCH-01", "KR", "Gyeongsangbuk-do", "Yeongcheon",        35.97, 128.94,  100, 2018),
    ("KR-SAN-01", "KR", "Gyeongsangbuk-do", "Sangju",            36.41, 128.16,   80, 2018),
    ("KR-JEJ-01", "KR", "Jeju-do",          "Seogwipo",          33.25, 126.56,   60, 2017),
    ("KR-BOE-01", "KR", "Chungcheongbuk-do","Boeun",             36.49, 127.73,  170, 2019),
    ("KR-GMJ-01", "KR", "Jeollabuk-do",     "Gimje",             35.80, 126.88,   10, 2017),
    ("KR-HAE-01", "KR", "Jeollanam-do",     "Haenam",            34.57, 126.60,   20, 2020),
    ("KR-YYG-01", "KR", "Gyeongsangbuk-do", "Yeongyang",         36.67, 129.11,  250, 2020),
    ("KR-HCN-01", "KR", "Gangwon-do",       "Hongcheon",         37.69, 127.89,  130, 2021),
    ("JP-HIR-01", "JP", "Aomori",           "Hirosaki",          40.60, 140.46,   50, 2019),
    ("JP-FUE-01", "JP", "Yamanashi",        "Fuefuki",           35.65, 138.64,  300, 2019),
    ("JP-MIN-01", "JP", "Wakayama",         "Minabe",            33.77, 135.33,   50, 2020),
    ("JP-YAW-01", "JP", "Ehime",            "Yawatahama",        33.46, 132.42,   80, 2020),
    ("JP-UON-01", "JP", "Niigata",          "Minamiuonuma",      37.06, 138.88,  180, 2019),
    ("CN-QIX-01", "CN", "Shandong",         "Qixia",             37.30, 120.83,  150, 2020),
    ("CN-CON-01", "CN", "Guangdong",        "Conghua",           23.55, 113.59,   40, 2021),
    ("CN-GAO-01", "CN", "Hebei",            "Gaocheng",          38.03, 114.85,   60, 2021),
    ("TW-FAN-01", "TW", "Pingtung",         "Fangshan",          22.26, 120.65,   20, 2021),
    ("VN-LNG-01", "VN", "Bac Giang",        "Luc Ngan",          21.38, 106.55,   50, 2021),
    ("VN-KCH-01", "VN", "Hung Yen",         "Khoai Chau",        20.83, 105.98,    5, 2022),
    ("VN-TLA-01", "VN", "Can Tho",          "Thoi Lai",          10.07, 105.56,    2, 2022),
    ("TH-KHL-01", "TH", "Chanthaburi",      "Khlung",            12.45, 102.22,   30, 2021),
    ("TH-SAR-01", "TH", "Chiang Mai",       "Saraphi",           18.71,  99.04,  300, 2022),
    ("PH-JOR-01", "PH", "Guimaras",         "Jordan",            10.60, 122.59,   50, 2022),
    ("PH-MUN-01", "PH", "Nueva Ecija",      "Science City of Munoz", 15.72, 120.90, 50, 2022),
    ("ID-KAR-01", "ID", "Jawa Barat",       "Karawang",          -6.32, 107.31,   15, 2023),
    ("IN-KOT-01", "IN", "Himachal Pradesh", "Kotgarh",           31.30,  77.48, 2000, 2022),
    ("IN-RAT-01", "IN", "Maharashtra",      "Ratnagiri",         16.99,  73.31,   20, 2023),
    ("NP-MAR-01", "NP", "Gandaki",          "Marpha",            28.75,  83.68, 2670, 2023),
]

# site_id, crop_id, cultivar, {stage_code: mean day-of-year}
DEMO_PROGRAMS = [
    ("KR-AND-01", "apple",            "Fuji",               {"07": 88, "60": 108, "65": 113, "69": 122, "87": 300, "93": 310}),
    ("KR-NAJ-01", "pear-asian",       "Niitaka",            {"07": 85, "60": 100, "65": 104, "69": 112, "87": 278, "93": 318}),
    ("KR-YCH-01", "grape",            "Campbell Early",     {"07": 110, "60": 148, "65": 152, "69": 158, "87": 232, "93": 300}),
    ("KR-SAN-01", "persimmon",        "Sangju-dungsi",      {"07": 105, "60": 140, "65": 144, "69": 150, "87": 296, "93": 312}),
    ("KR-JEJ-01", "mandarin-satsuma", "Miyagawa-wase",      {"51": 105, "60": 125, "65": 130, "69": 138, "87": 315}),
    ("KR-BOE-01", "jujube",           "Boeun-daechu",       {"07": 120, "60": 165, "65": 172, "69": 185, "87": 270, "93": 305}),
    ("KR-GMJ-01", "rice",             "Shindongjin",        {"00": 108, "09": 116, "51": 222, "55": 226, "89": 272, "99": 280}),
    ("KR-HAE-01", "cabbage-napa",     "Bulam No. 3",        {"00": 235, "09": 239, "41": 270, "49": 315, "99": 320}),
    ("KR-YYG-01", "pepper-chili",     "Cheongyang",         {"00": 125, "60": 165, "81": 205, "89": 225}),
    ("KR-HCN-01", "soybean",          "Daewon",             {"00": 155, "09": 162, "60": 205, "89": 280, "99": 290}),
    ("JP-HIR-01", "apple",            "Fuji",               {"07": 100, "60": 124, "65": 129, "69": 137, "87": 310, "93": 313}),
    ("JP-FUE-01", "peach",            "Hakuho",             {"07": 82, "60": 92, "65": 96, "69": 104, "87": 190, "93": 315}),
    ("JP-MIN-01", "ume",              "Nanko",              {"60": 30, "65": 40, "69": 55, "07": 75, "87": 160}),
    ("JP-YAW-01", "mandarin-satsuma", "Miyagawa-wase",      {"51": 100, "60": 122, "65": 127, "69": 135, "87": 325}),
    ("JP-UON-01", "rice",             "Koshihikari",        {"00": 105, "09": 112, "51": 215, "55": 219, "89": 258, "99": 265}),
    ("CN-QIX-01", "apple",            "Fuji",               {"07": 90, "60": 112, "65": 116, "69": 124, "87": 298, "93": 315}),
    ("CN-CON-01", "lychee",           "Nuomici",            {"51": 30, "60": 65, "65": 75, "69": 88, "87": 170}),
    ("CN-GAO-01", "wheat",            "Jimai 22",           {"51": 115, "55": 118, "65": 125, "89": 158, "99": 160}),
    ("TW-FAN-01", "mango",            "Irwin",              {"51": 10, "60": 25, "65": 40, "69": 55, "87": 160}),
    ("VN-LNG-01", "lychee",           "Thieu",              {"51": 20, "60": 70, "65": 78, "69": 90, "87": 165}),
    ("VN-KCH-01", "longan",           "Long Hung Yen",      {"51": 50, "60": 75, "65": 85, "69": 100, "87": 215}),
    ("VN-TLA-01", "rice",             "OM5451",             {"00": 105, "09": 110, "51": 165, "55": 168, "89": 195, "99": 198}),
    ("TH-KHL-01", "durian",           "Monthong",           {"51": 5, "60": 35, "65": 40, "69": 47, "87": 140}),
    ("TH-SAR-01", "longan",           "Daw",                {"51": 15, "60": 45, "65": 55, "69": 65, "87": 210}),
    ("PH-JOR-01", "mango",            "Carabao",            {"51": 15, "60": 25, "65": 32, "69": 45, "87": 130}),
    ("PH-MUN-01", "rice",             "NSIC Rc 222",        {"00": 170, "09": 174, "51": 240, "55": 243, "89": 275, "99": 280}),
    ("ID-KAR-01", "rice",             "Ciherang",           {"00": 90, "09": 95, "51": 150, "55": 153, "89": 180, "99": 183}),
    ("IN-KOT-01", "apple",            "Royal Delicious",    {"07": 75, "60": 95, "65": 100, "69": 110, "87": 240, "93": 310}),
    ("IN-RAT-01", "mango",            "Alphonso",           {"51": 5, "60": 20, "65": 30, "69": 45, "87": 110}),
    ("NP-MAR-01", "apple",            "Red Delicious",      {"07": 85, "60": 105, "65": 110, "69": 118, "87": 255, "93": 300}),
]

FIELDS = [
    "record_id", "status", "country_code", "admin1", "locality", "site_id",
    "latitude", "longitude", "elevation_m", "crop_id", "scientific_name",
    "cultivar", "stage_scale", "stage_code", "obs_date", "year", "doy",
    "observer_id", "observer_role", "method", "n_plants", "confidence",
    "qc_status", "photo", "notes",
]

ROLES = ["farmer"] * 8 + ["extension officer", "researcher"]
NOTES = ["", "", "", "", "", "", "late frost on 2 nights", "dry spell", "heavy rain during flowering",
         "typhoon damage", "warm spell", "hail damage on some fruit", "new block observed"]


def build_reference(ref):
    js = "/* Generated by tools/build_data.py from data/reference.json. Do not edit. */\n"
    js += "window.PB_REF = " + json.dumps(ref, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (DATA / "reference.js").write_text(js, encoding="utf-8")


def build_demo(ref):
    rng = random.Random(SEED)
    crops = {c["id"]: c for c in ref["crops"]}
    sites = {s[0]: s for s in SITES}
    year_anom = {}  # (country, year) -> spring anomaly in days
    rows = []
    seq = {}

    for site_id, crop_id, cultivar, stages in DEMO_PROGRAMS:
        sid, cc, admin1, loc, lat, lon, elev, first = sites[site_id]
        crop = crops[crop_id]
        observer = "OBS-%s-%03d" % (cc, rng.randint(1, 120))
        role = rng.choice(ROLES)
        n_plants = 5 if crop["scale"].startswith("FRUIT") else 10
        for year in range(first, CUTOFF.year + 1):
            anom = year_anom.setdefault((cc, year), rng.gauss(0, 3.5))
            for code, base in sorted(stages.items(), key=lambda kv: kv[1]):
                if rng.random() < 0.12:
                    continue  # missed observation
                spring = base < 200
                trend = -0.3 * (year - 2017) if spring else 0.15 * (year - 2017)
                doy = round(base + trend + (anom if spring else anom * 0.4) + rng.gauss(0, 2.5))
                doy = max(1, min(365, doy))
                date = dt.date(year, 1, 1) + dt.timedelta(days=doy - 1)
                if date > CUTOFF:
                    continue
                seq[cc] = seq.get(cc, 0) + 1
                recent = year == CUTOFF.year
                rows.append({
                    "record_id": "PR-%s-%06d" % (cc, seq[cc]),
                    "status": "DEMO",
                    "country_code": cc,
                    "admin1": admin1,
                    "locality": loc,
                    "site_id": sid,
                    "latitude": "%.2f" % lat,
                    "longitude": "%.2f" % lon,
                    "elevation_m": elev,
                    "crop_id": crop_id,
                    "scientific_name": crop["sci"],
                    "cultivar": cultivar,
                    "stage_scale": crop["scale"],
                    "stage_code": code,
                    "obs_date": date.isoformat(),
                    "year": year,
                    "doy": date.timetuple().tm_yday,
                    "observer_id": observer,
                    "observer_role": role,
                    "method": "tagged plants" if crop["scale"].startswith("FRUIT") else "fixed plot",
                    "n_plants": n_plants,
                    "confidence": rng.choices(["high", "medium", "low"], [7, 2, 1])[0],
                    "qc_status": "unverified" if recent or rng.random() < 0.05 else "verified",
                    "photo": "yes" if rng.random() < 0.4 else "no",
                    "notes": rng.choice(NOTES) if spring else "",
                })

    rows.sort(key=lambda r: (r["country_code"], r["obs_date"], r["site_id"]))

    with open(DATA / "observations.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)

    site_table = [
        {"site_id": s[0], "country_code": s[1], "admin1": s[2], "locality": s[3],
         "latitude": s[4], "longitude": s[5], "elevation_m": s[6], "first_year": s[7]}
        for s in SITES
    ]
    payload = {
        "generated": CUTOFF.isoformat(),
        "demo": True,
        "fields": FIELDS,
        "rows": [[r[k] for k in FIELDS] for r in rows],
        "sites": site_table,
    }
    js = "/* Generated by tools/build_data.py. SYNTHETIC DEMONSTRATION DATA, not real observations. */\n"
    js += "window.PB_OBS = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (DATA / "observations.js").write_text(js, encoding="utf-8")
    return len(rows)


def main():
    ref = json.loads((DATA / "reference.json").read_text(encoding="utf-8"))
    ref.pop("_comment", None)
    build_reference(ref)
    n = build_demo(ref)
    print("reference.js: %d crops, %d scales" % (len(ref["crops"]), len(ref["scales"])))
    print("observations: %d demo records" % n)


if __name__ == "__main__":
    main()
