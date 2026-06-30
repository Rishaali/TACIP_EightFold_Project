from typing import Dict, Any, List


def generate_ai_analysis(overall_confidence: float) -> Dict[str, Any]:
    """Generate AI insights based on confidence score."""
    if overall_confidence >= 90:
        return {
            "rating": "Excellent Candidate",
            "tags": ["Ready for Interview", "Strong Resume", "Good Skill Match", "Top Performer"],
            "red_flags": [],
            "suggestions": [
                "Schedule technical interview immediately.",
                "Candidate shows strong alignment with role requirements.",
                "Consider fast-tracking to final round.",
            ],
        }
    elif overall_confidence >= 70:
        return {
            "rating": "Good Candidate",
            "tags": ["Needs Manual Review", "Recommend Technical Interview", "Moderate Match"],
            "red_flags": ["Some fields may need verification"],
            "suggestions": [
                "Conduct a technical screening call.",
                "Verify experience details during interview.",
                "Ask for portfolio or code samples.",
            ],
        }
    else:
        return {
            "rating": "Low Confidence",
            "tags": ["Incomplete Profile", "Missing Skills", "Needs Resume Improvement"],
            "red_flags": ["Profile is incomplete", "Low skill match score"],
            "suggestions": [
                "Request a more detailed resume.",
                "Candidate should add skills and experience sections.",
                "Consider rejecting or placing in a lower priority pool.",
            ],
        }


def determine_status(overall_confidence: float) -> str:
    if overall_confidence >= 85:
        return "Selected"
    elif overall_confidence >= 65:
        return "Review Required"
    else:
        return "Rejected"
