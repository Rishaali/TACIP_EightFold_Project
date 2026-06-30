import re
import phonenumbers
from typing import Any, Dict, List, Optional

from schemas.output_config import OutputConfig, FieldConfig, NormalizeType, OnMissing


SENTINEL = object()


def get_nested(obj: Any, path: str) -> Any:
    """
    Resolve a dotted/bracket path from a dict.
    Supports:
      - "full_name"
      - "emails[0]"       -> first element of list
      - "skills[].name"   -> list of .name from all items
      - "location.city"
    """
    if not path or obj is None:
        return SENTINEL

    # Array map: "skills[].name"
    if "[]." in path:
        key, rest = path.split("[].", 1)
        parent = get_nested(obj, key)
        if parent is SENTINEL or not isinstance(parent, list):
            return SENTINEL
        return [get_nested(item, rest) for item in parent if get_nested(item, rest) is not SENTINEL]

    # Index access: "emails[0]"
    idx_match = re.match(r"^(\w+)\[(\d+)\]$", path)
    if idx_match:
        key, idx = idx_match.group(1), int(idx_match.group(2))
        val = obj.get(key) if isinstance(obj, dict) else getattr(obj, key, SENTINEL)
        if val is SENTINEL or not isinstance(val, list) or idx >= len(val):
            return SENTINEL
        return val[idx]

    # Dot path: "location.city"
    if "." in path:
        key, rest = path.split(".", 1)
        child = obj.get(key) if isinstance(obj, dict) else getattr(obj, key, SENTINEL)
        return get_nested(child, rest)

    # Simple key
    return obj.get(path, SENTINEL) if isinstance(obj, dict) else getattr(obj, path, SENTINEL)


def normalize_value(value: Any, norm_type: Optional[str]) -> Any:
    """Apply normalization to a field value."""
    if value is SENTINEL or value is None:
        return value

    if norm_type == NormalizeType.LOWERCASE:
        if isinstance(value, str):
            return value.lower()
        if isinstance(value, list):
            return [v.lower() if isinstance(v, str) else v for v in value]

    elif norm_type == NormalizeType.TRIM:
        if isinstance(value, str):
            return value.strip()

    elif norm_type == NormalizeType.E164:
        # Normalize phone to E.164
        if isinstance(value, str):
            try:
                parsed = phonenumbers.parse(value, "IN")  # Default region India
                if phonenumbers.is_valid_number(parsed):
                    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            except:
                pass
        if isinstance(value, list):
            result = []
            for p in value:
                try:
                    parsed = phonenumbers.parse(p, "IN")
                    if phonenumbers.is_valid_number(parsed):
                        result.append(phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164))
                    else:
                        result.append(p)
                except:
                    result.append(p)
            return result

    elif norm_type == NormalizeType.CANONICAL:
        # Canonicalize skill names to title case
        if isinstance(value, list):
            return [v.strip().title() if isinstance(v, str) else v for v in value]
        if isinstance(value, str):
            return value.strip().title()

    return value


def project_candidate(candidate_dict: Dict, config: OutputConfig) -> Dict:
    """
    Apply runtime output configuration to a candidate dict.
    Returns a reshaped output according to user-defined field projection.
    """
    output = {}
    errors = []

    for field_cfg in config.fields:
        # Resolve source path
        source_path = field_cfg.from_field if field_cfg.from_field else field_cfg.path
        value = get_nested(candidate_dict, source_path)

        # Handle missing
        if value is SENTINEL:
            if field_cfg.required and config.on_missing == OnMissing.ERROR:
                errors.append(f"Required field '{field_cfg.path}' is missing (source: '{source_path}')")
                continue
            if config.on_missing == OnMissing.OMIT:
                continue
            value = None  # NULL

        # Apply normalization
        if field_cfg.normalize:
            value = normalize_value(value, field_cfg.normalize)

        # Use label (renamed field) or original path as key
        output_key = field_cfg.label if field_cfg.label else field_cfg.path
        output[output_key] = value

    # Conditionally include confidence
    if config.include_confidence:
        output["overall_confidence"] = candidate_dict.get("overall_confidence", 0.0)

    # Conditionally include provenance
    if config.include_provenance:
        output["provenance"] = candidate_dict.get("provenance", [])

    return {"output": output, "errors": errors, "valid": len(errors) == 0}


# Default output config (standard schema)
DEFAULT_CONFIG = OutputConfig(
    fields=[
        FieldConfig(path="candidate_id", required=True),
        FieldConfig(path="full_name", required=True),
        FieldConfig(path="emails", required=False),
        FieldConfig(path="phones", required=False),
        FieldConfig(path="location", required=False),
        FieldConfig(path="links", required=False),
        FieldConfig(path="headline", required=False),
        FieldConfig(path="years_experience", required=False),
        FieldConfig(path="skills", required=False),
        FieldConfig(path="experience", required=False),
        FieldConfig(path="education", required=False),
    ],
    include_confidence=True,
    include_provenance=True,
    on_missing=OnMissing.NULL,
)
