# Builds the origin map's SVG paths from Natural Earth (public domain).
# Usage: python3 -I map.py NE_DIR > map-paths.json
import json, math, sys

ne = sys.argv[1]
LON0, LON1, LAT0, LAT1 = -98.0, -60.0, -5.0, 38.0
PHI = math.radians(17)
W = 600.0
KX = W / (LON1 - LON0)
KY = KX / math.cos(PHI)
H = (LAT1 - LAT0) * KY
PAD = 3.0


def proj(lon, lat):
    lon = min(max(lon, LON0 - PAD), LON1 + PAD)
    lat = min(max(lat, LAT0 - PAD), LAT1 + PAD)
    return ((lon - LON0) * KX, (LAT1 - lat) * KY)


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L < 1e-6:  # a closed ring: measure from the shared end point
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / L
            if d > best:
                best, idx = d, i
        if best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def rings(geom):
    if geom["type"] == "Polygon":
        return geom["coordinates"]
    if geom["type"] == "MultiPolygon":
        return [r for poly in geom["coordinates"] for r in poly]
    return []


def visible(ring):
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return not (max(lons) < LON0 or min(lons) > LON1 or max(lats) < LAT0 or min(lats) > LAT1)


def path(geoms, tol=1.1, min_area=12.0):
    out = []
    for g in geoms:
        for ring in rings(g):
            if not visible(ring):
                continue
            pts = dp([proj(x, y) for x, y in ring], tol)
            if len(pts) < 4:
                continue
            area = 0.5 * abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts))))
            if area < min_area:
                continue
            out.append("M" + "L".join("%.1f %.1f" % p for p in pts[:-1]) + "Z")
    return "".join(out)


countries = json.load(open(ne + "/land50.geojson"))["features"]
land = [f["geometry"] for f in countries]
colombia = [f["geometry"] for f in countries if f["properties"].get("ADM0_A3") == "COL"]
states = json.load(open(ne + "/states.geojson"))["features"]
georgia = [f["geometry"] for f in states if f["properties"].get("name") == "Georgia" and f["properties"].get("iso_a2") == "US"]


def hav(a, b):
    (la1, lo1), (la2, lo2) = a, b
    p1, p2 = math.radians(la1), math.radians(la2)
    dl = math.radians(lo2 - lo1)
    dp_ = p2 - p1
    h = math.sin(dp_ / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 3958.8 * math.asin(math.sqrt(h))


antioquia_sw = (5.75, -75.9)
marietta = (33.9076, -84.6009)
smyrna = (33.8436, -84.5043)
print(json.dumps({
    "viewBox": "0 0 %d %d" % (W, round(H)),
    "land": path(land),
    "colombia": path(colombia, tol=0.5, min_area=1),
    "georgia": path(georgia, tol=0.5, min_area=1),
    "antioquia": proj(antioquia_sw[1], antioquia_sw[0]),
    "marietta": proj(marietta[1], marietta[0]),
    "smyrna": proj(smyrna[1], smyrna[0]),
    "miles": round(hav(antioquia_sw, marietta)),
    "label_colombia": proj(-73.2, 4.0),
    "label_georgia": proj(-83.4, 32.6),
    "label_caribbean": proj(-75.5, 15.0),
    "label_gulf": proj(-90.5, 25.5),
}, indent=1))
