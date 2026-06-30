from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class NormalizeType(str, Enum):
    E164 = "E164"
    CANONICAL = "canonical"
    LOWERCASE = "lowercase"
    TRIM = "trim"
    NONE = "none"


class OnMissing(str, Enum):
    NULL = "null"
    OMIT = "omit"
    ERROR = "error"


class FieldConfig(BaseModel):
    path: str
    from_field: Optional[str] = None  # e.g. "emails[0]", "skills[].name"
    normalize: Optional[NormalizeType] = None
    required: bool = False
    label: Optional[str] = None       # renamed display label


class OutputConfig(BaseModel):
    fields: List[FieldConfig] = []
    include_confidence: bool = True
    include_provenance: bool = True
    on_missing: OnMissing = OnMissing.NULL

    class Config:
        use_enum_values = True
