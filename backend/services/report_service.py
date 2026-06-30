import json
import csv
import io
from typing import List, Dict, Any
from datetime import datetime


def export_json(candidates: List[Dict]) -> str:
    """Return JSON string of candidates."""
    return json.dumps(candidates, indent=2, default=str)


def export_csv(candidates: List[Dict]) -> str:
    """Return CSV string of candidates (flattened)."""
    if not candidates:
        return ""

    output = io.StringIO()

    def flatten(obj: Any, prefix: str = "") -> Dict:
        result = {}
        if isinstance(obj, dict):
            for k, v in obj.items():
                key = f"{prefix}.{k}" if prefix else k
                result.update(flatten(v, key))
        elif isinstance(obj, list):
            result[prefix] = ", ".join(str(i) for i in obj)
        else:
            result[prefix] = obj
        return result

    flat_candidates = [flatten(c) for c in candidates]
    all_keys = list({k for c in flat_candidates for k in c.keys()})

    writer = csv.DictWriter(output, fieldnames=all_keys, extrasaction="ignore")
    writer.writeheader()
    for c in flat_candidates:
        writer.writerow({k: c.get(k, "") for k in all_keys})

    return output.getvalue()


def export_pdf_report(candidates: List[Dict]) -> bytes:
    """Return PDF bytes of candidate summary report using reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.enums import TA_CENTER

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()

    story = []

    # Title
    title_style = ParagraphStyle("Title", parent=styles["Title"],
                                  fontSize=18, textColor=colors.HexColor("#6366f1"),
                                  spaceAfter=6, alignment=TA_CENTER)
    story.append(Paragraph("TACIP — Candidate Intelligence Report", title_style))

    sub_style = ParagraphStyle("Sub", parent=styles["Normal"],
                                fontSize=9, textColor=colors.grey,
                                spaceAfter=12, alignment=TA_CENTER)
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", sub_style))
    story.append(Spacer(1, 10))

    # Summary Table
    headers = ["Name", "Email", "Skills", "Experience", "Confidence", "Status"]
    data = [headers]
    for c in candidates:
        row = [
            str(c.get("full_name", ""))[:30],
            (c.get("emails") or [""])[0][:30],
            ", ".join((c.get("skills") or [])[:3]),
            f"{c.get('years_experience', 0)} yrs",
            f"{c.get('overall_confidence', 0):.1f}%",
            str(c.get("status", "Pending")),
        ]
        data.append(row)

    table = Table(data, colWidths=[40*mm, 50*mm, 40*mm, 25*mm, 25*mm, 25*mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9ff")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
