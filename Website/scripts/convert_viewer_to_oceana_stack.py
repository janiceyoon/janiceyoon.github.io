#!/usr/bin/env python3
"""
Replace first <section class="project-media"> that contains <div class="viewer" data-viewer>
with Oceana-style vertical stack markup. Removes project-viewer.js script tag when present.
Adds project--oceana-stack to <body class="..."> if missing.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def add_body_class(html: str) -> str:
    if "project--oceana-stack" in html:
        return html
    return re.sub(
        r'(<body class="[^"]*portfolio-page[^"]*)(")',
        r"\1 project--oceana-stack\2",
        html,
        count=1,
    )


def remove_viewer_script(html: str) -> str:
    return re.sub(
        r'\s*<script src="project-viewer\.js[^"]*" defer></script>\s*',
        "\n",
        html,
    )


def extract_thumb_entries(html: str) -> list[tuple[str, str]]:
    """Return list of (src, alt) from viewer-thumb buttons (any attribute order)."""
    out: list[tuple[str, str]] = []
    for m in re.finditer(r"<button[^>]*viewer-thumb[^>]*>", html):
        tag = m.group(0)
        sm = re.search(r'data-src="([^"]+)"', tag)
        am = re.search(r'data-alt="([^"]*)"', tag)
        if sm:
            out.append((sm.group(1), am.group(1) if am else ""))
    return out


def esc_alt(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;")


def build_stack_figures(entries: list[tuple[str, str]], aria: str) -> str:
    lines = [
        f'    <section class="project-media project-media--oceana-stack" aria-label="{esc_alt(aria)}">',
        '      <div class="project-oceana-stack">',
    ]
    for i, (src, alt) in enumerate(entries):
        lazy = "" if i == 0 else '\n            loading="lazy"'
        dec = "\n            decoding=\"async\""
        alt_esc = esc_alt(alt)
        lines.append('        <figure class="project-oceana-stack__item">')
        lines.append(
            f'          <img\n            src="{src}"\n            alt="{alt_esc}"{lazy}{dec}\n          />'
        )
        lines.append("        </figure>")
    lines.append("      </div>")
    lines.append("    </section>")
    return "\n".join(lines) + "\n"


def build_stack_from_video_img(items: list[tuple[str, str, str | None]], aria: str) -> str:
    lines = [
        f'    <section class="project-media project-media--oceana-stack" aria-label="{aria}">',
        '      <div class="project-oceana-stack">',
    ]
    for i, it in enumerate(items):
        tag, a, b = it
        if tag == "video":
            poster = f' poster="{b}"' if b else ""
            lines.append("        <figure class=\"project-oceana-stack__item\">")
            lines.append(
                f'          <video controls playsinline src="{a}"{poster} aria-label="{aria} — video"></video>'
            )
            lines.append("        </figure>")
        else:
            lazy = "" if i == 0 else "\n            loading=\"lazy\""
            lines.append("        <figure class=\"project-oceana-stack__item\">")
            alt_esc = (b or "").replace("&", "&amp;").replace('"', "&quot;") if False else ""
            # b is poster for video tuple - for img tuple is (img, src, alt) — fix unpack
            pass
    raise NotImplementedError


def build_stack_mixed(items: list[tuple[str, str, str | None]], aria: str) -> str:
    """items: ('video', src, poster) or ('img', src, alt)"""
    lines = [
        f'    <section class="project-media project-media--oceana-stack" aria-label="{esc_alt(aria)}">',
        '      <div class="project-oceana-stack">',
    ]
    for i, tup in enumerate(items):
        kind = tup[0]
        if kind == "video":
            _, src, poster = tup
            poster_attr = f' poster="{poster}"' if poster else ""
            lines.append("        <figure class=\"project-oceana-stack__item\">")
            lines.append(
                f'          <video controls playsinline src="{src}"{poster_attr} aria-label="{esc_alt(aria + " — video")}"></video>'
            )
            lines.append("        </figure>")
        else:
            _, src, alt = tup
            lazy = "" if i == 0 else "\n            loading=\"lazy\""
            alt_esc = esc_alt(alt or "")
            dec = "\n            decoding=\"async\""
            lines.append("        <figure class=\"project-oceana-stack__item\">")
            lines.append(
                f'          <img\n            src="{src}"\n            alt="{alt_esc}"{lazy}{dec}\n          />'
            )
            lines.append("        </figure>")
    lines.append("      </div>")
    lines.append("    </section>")
    return "\n".join(lines) + "\n"


def replace_first_viewer_section(html: str, new_section: str) -> str:
    m = re.search(
        r'(\s*)<section class="project-media"[^>]*>\s*<div[^>]*\bdata-viewer\b[^>]*>.*?</div>\s*</section>',
        html,
        re.DOTALL,
    )
    if not m:
        raise ValueError("No viewer-based project-media section found")
    indent = m.group(1)
    return html[: m.start()] + indent + new_section.strip() + html[m.end() :]


def convert_viewer_frame_only(path: Path) -> None:
    html = path.read_text(encoding="utf-8")
    if "data-viewer" in html:
        return
    m = re.search(
        r'(\s*)<section class="project-media"[^>]*>\s*<div class="viewer-frame"[^>]*>.*?</div>\s*</section>',
        html,
        re.DOTALL,
    )
    if not m:
        return
    block = m.group(0)
    aria_m = re.search(r'<section class="project-media"[^>]*aria-label="([^"]*)"', block)
    aria_label = aria_m.group(1) if aria_m else "Project media"
    img_m = re.search(r"<img\s+([^>]+)>", block, re.DOTALL)
    if img_m:
        attrs = img_m.group(1)
        sm = re.search(r'src="([^"]+)"', attrs)
        am = re.search(r'alt="([^"]*)"', attrs)
        src = sm.group(1) if sm else ""
        alt = am.group(1) if am else ""
        lazy = '\n            loading="lazy"' if 'loading="lazy"' in attrs else ""
        new_sec = f"""    <section class="project-media project-media--oceana-stack" aria-label="{esc_alt(aria_label)}">
      <div class="project-oceana-stack">
        <figure class="project-oceana-stack__item">
          <img
            src="{src}"
            alt="{esc_alt(alt)}"{lazy}
            decoding="async"
          />
        </figure>
      </div>
    </section>
"""
    else:
        vm = re.search(r"<video\s+([^>]+)>", block, re.DOTALL | re.I)
        if not vm:
            return
        va = vm.group(1)
        sm = re.search(r'src="([^"]+)"', va)
        pm = re.search(r'poster="([^"]*)"', va)
        am = re.search(r'aria-label="([^"]*)"', va)
        src = sm.group(1) if sm else ""
        poster = f' poster="{pm.group(1)}"' if pm else ""
        vlabel = am.group(1) if am else aria_label
        new_sec = f"""    <section class="project-media project-media--oceana-stack" aria-label="{esc_alt(aria_label)}">
      <div class="project-oceana-stack">
        <figure class="project-oceana-stack__item">
          <video controls playsinline src="{src}"{poster} aria-label="{esc_alt(vlabel)}"></video>
        </figure>
      </div>
    </section>
"""
    html = html[: m.start()] + m.group(1) + new_sec.strip() + "\n" + html[m.end() :]
    html = add_body_class(html)
    path.write_text(html, encoding="utf-8")
    print("OK frame-only", path.name)


def main() -> None:
    # skinmap: 2 thumbs + figma link on hero — preserve link on first image
    ps = ROOT / "project-skinmap.html"
    html = ps.read_text(encoding="utf-8")
    entries = extract_thumb_entries(html)
    fig1 = (
        "        <figure class=\"project-oceana-stack__item\">\n"
        '          <a href="https://www.figma.com/proto/qCkfMU9G47OdSYl7WexHjE/skinmap?node-id=1-2&p=f&m=draw&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=1%3A2&show-proto-sidebar=1&t=vWFJahgkJrF69Qeo-1" '
        'target="_blank" rel="noopener noreferrer" class="project-skinmap-stack-link">\n'
        f'            <img src="{entries[0][0]}" alt="{esc_alt(entries[0][1])}" decoding="async" />\n'
        "          </a>\n"
        "        </figure>\n"
    )
    rest = []
    for src, alt in entries[1:]:
        alt_esc = alt.replace("&", "&amp;").replace('"', "&quot;")
        rest.append(
            "        <figure class=\"project-oceana-stack__item\">\n"
            f'          <img src="{src}" alt="{alt_esc}" loading="lazy" decoding="async" />\n'
            "        </figure>\n"
        )
    new_sec = (
        '    <section class="project-media project-media--oceana-stack" aria-label="SKINMAP — screens">\n'
        "      <div class=\"project-oceana-stack\">\n"
        + fig1
        + "".join(rest)
        + "      </div>\n"
        "    </section>\n"
    )
    html = replace_first_viewer_section(html, new_sec)
    html = re.sub(
        r'\s*<script src="project-viewer\.js[^"]*" defer></script>\s*',
        "\n",
        html,
        count=1,
    )
    html = add_body_class(html)
    ps.write_text(html, encoding="utf-8")
    print("OK", ps.name)

    # All standard thumb-based viewers
    skip = {"project-skinmap.html", "project-37.html", "project-44.html", "project-42.html"}
    for path in sorted(ROOT.glob("project-*.html")):
        if path.name in skip:
            continue
        if path.name in ("project-41.html", "project-22.html", "project-5.html", "project-10.html"):
            continue  # already converted
        text = path.read_text(encoding="utf-8")
        if "data-viewer" not in text:
            continue
        if "viewer-main-stack" in text:
            i0 = text.find("viewer-main-stack")
            stack_block = text[i0 : text.find("viewer-thumbs", i0)]
            fixed: list[tuple[str, str, str | None]] = []
            for tag, attrs in re.findall(r"<(video|img)([^>]*?)>", stack_block, re.I | re.DOTALL):
                if tag.lower() == "video":
                    sm = re.search(r'src="([^"]+)"', attrs)
                    pm = re.search(r'poster="([^"]*)"', attrs)
                    fixed.append(("video", sm.group(1) if sm else "", pm.group(1) if pm else None))
                else:
                    sm = re.search(r'src="([^"]+)"', attrs)
                    am = re.search(r'alt="([^"]*)"', attrs)
                    fixed.append(("img", sm.group(1) if sm else "", am.group(1) if am else None))
            aria_m = re.search(
                r'<section class="project-media"[^>]*aria-label="([^"]*)"', text
            )
            aria_label = aria_m.group(1) if aria_m else "Project media"
            try:
                new_sec = build_stack_mixed(fixed, aria_label)
                text2 = replace_first_viewer_section(text, new_sec)
                text2 = add_body_class(text2)
                text2 = remove_viewer_script(text2)
                path.write_text(text2, encoding="utf-8")
                print("OK video-stack", path.name)
            except ValueError as e:
                print("FAIL", path.name, e)
            continue
        entries = extract_thumb_entries(text)
        if not entries:
            print("SKIP no thumbs", path.name)
            continue
        try:
            aria_m = re.search(
                r'<section class="project-media"[^>]*aria-label="([^"]*)"', text
            )
            aria_label = aria_m.group(1) if aria_m else "Project media"
            new_sec = build_stack_figures(entries, aria_label)
            text2 = replace_first_viewer_section(text, new_sec)
            text2 = add_body_class(text2)
            text2 = remove_viewer_script(text2)
            path.write_text(text2, encoding="utf-8")
            print("OK", path.name)
        except ValueError as e:
            print("FAIL", path.name, e)

    # Single-image viewer-frame pages (e.g. project-29)
    for path in sorted(ROOT.glob("project-*.html")):
        t = path.read_text(encoding="utf-8")
        if "data-viewer" in t:
            continue
        if "viewer-frame" not in t or "project-media" not in t:
            continue
        if "project-oceana-stack" in t:
            continue
        convert_viewer_frame_only(path)


if __name__ == "__main__":
    main()
