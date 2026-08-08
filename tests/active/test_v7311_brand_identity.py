import struct
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "assets" / "brand"


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def png_size(path):
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", data[16:24])


def test_brand_vectors_are_one_accessible_identity_system():
    expected = {
        "foko-lab-emblem.svg": "0 0 256 256",
        "foko-lab-mark.svg": "0 0 128 128",
        "foko-lab-micro.svg": "0 0 64 64",
        "foko-lab-logo.svg": "0 0 430 112",
        "foko-lab-logo-display.svg": "0 0 560 180",
    }
    for name, viewbox in expected.items():
        root = ET.parse(BRAND / name).getroot()
        assert root.attrib["viewBox"] == viewbox
        assert root.attrib["role"] == "img"
        assert root.attrib["aria-labelledby"] == "title desc"
        labels = [node.tag.rsplit("}", 1)[-1] for node in root]
        assert "title" in labels and "desc" in labels


def test_state_observatory_encodes_continuous_inference_discrete_and_state_layers():
    emblem = (BRAND / "foko-lab-emblem.svg").read_text(encoding="utf-8")
    mark = (BRAND / "foko-lab-mark.svg").read_text(encoding="utf-8")
    micro = (BRAND / "foko-lab-micro.svg").read_text(encoding="utf-8")
    system = text("assets/brand/brand-system.json")
    for color in ("#17232D", "#243C86", "#654DA6", "#009B89", "#5E9A68", "#D17B2F", "#F8F6EE"):
        assert color in system
    assert "State Observatory" in system and "Foko Kuate" in system
    assert "M128 17 224 68 128 119 32 68Z" in emblem
    assert "M128 100 212 145 128 190 44 145Z" in emblem
    assert "M128 151 221 201 128 251 35 201Z" in emblem
    assert "M128 46V228" in emblem and "M128 201C110 191" in emblem
    assert "M64 8 113 34 64 60 15 34Z" in mark
    assert "M64 72 99 91 64 110 29 91Z" in mark
    assert "M32 6 58 20 32 34 6 20Z" in micro and "M32 13V47" in micro
    display = (BRAND / "foko-lab-logo-display.svg").read_text(encoding="utf-8")
    assert "MODELING · SIMULATION · VALIDATION" in display
    assert "compute evidence · challenge assumptions" in display


def test_header_uses_the_signature_palette_and_a_readable_compact_lockup():
    css = text("styles/v76-system.css").lower()
    assert "--brand: #243c86" in css
    assert "--brand-strong: #1d326f" in css
    assert "--paper: #f8f6ee" in css
    assert "--signal: #c98a19" in css
    assert ".v76-brand > img" in css
    assert ".foko-brand-observe-top" in css
    assert ".foko-brand-manifold" in css
    assert ".foko-brand-observe-mid" in css
    assert ".foko-brand-observe-bottom" in css
    assert ".foko-brand-state-axis" in css
    assert ".foko-brand-state" in css
    assert "--subject-accent" in css
    assert "--lab-accent-on-dark" in css
    shell = text("src/v76/app-shell.js")
    assert "adaptiveBrandMarkup" in shell
    assert "LAB_IDENTITIES" in shell and "SUBJECTS" in shell
    pages = list(ROOT.glob("*.html")) + list((ROOT / "research").glob("*.html"))
    authored = [page for page in pages if "data-v76-appbar=\"true\"" in page.read_text(encoding="utf-8")]
    assert len(authored) == len(pages)
    assert all("foko-lab-logo.svg" in page.read_text(encoding="utf-8") for page in authored)


def test_favicon_and_touch_assets_follow_responsive_brand_scaling():
    assert png_size(BRAND / "favicon-16.png") == (16, 16)
    assert png_size(BRAND / "favicon-32.png") == (32, 32)
    assert png_size(BRAND / "apple-touch-icon.png") == (180, 180)
    assert png_size(BRAND / "foko-lab-icon-512.png") == (512, 512)
    html = [page.read_text(encoding="utf-8") for page in list(ROOT.glob("*.html")) + list((ROOT / "research").glob("*.html"))]
    assert sum("foko-lab-micro.svg" in source for source in html) >= 30
    assert "favicon-32.png" in text("cv.html") and "favicon-16.png" in text("cv.html")
    ico = (ROOT / "favicon.ico").read_bytes()
    reserved, kind, image_count = struct.unpack("<HHH", ico[:6])
    assert (reserved, kind, image_count) == (0, 1, 2)
