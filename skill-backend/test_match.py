from main import match_skills, SkillMatchRequest


def test_match_example():
    payload = SkillMatchRequest(
        cvText="Experienced in Python, JavaScript, HTML, CSS, and database design with a focus on web development and problem solving.",
        applicationLetterText="I am eager to contribute to team projects, communicate clearly, and adapt quickly to new tools while managing deadlines.",
        interviewAnswers=["I enjoy collaborating, learning new technologies, and explaining ideas clearly."]
    )
    response = match_skills(payload)
    assert response.matchedSkills, "expected at least one matched skill"
    assert response.summary, "expected a summary"
    assert any(skill in response.matchedSkills for skill in ["programming", "web development", "communication", "teamwork"])


if __name__ == "__main__":
    test_match_example()
    print("skill matching test passed")
