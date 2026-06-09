use devo_protocol::CollaborationMode;

const BUILD_PROMPT_TEMPLATE: &str = include_str!("../prompts/collaboration-mode/build.md");
const PLAN_PROMPT_TEMPLATE: &str = include_str!("../prompts/collaboration-mode/plan.md");

fn prompt_body() -> String {
    format!(
        "{}\n\n{}",
        BUILD_PROMPT_TEMPLATE.trim_end(),
        PLAN_PROMPT_TEMPLATE.trim_end()
    )
}

pub(crate) fn active_mode_prompt(_collaboration_mode: CollaborationMode) -> String {
    prompt_body()
}

#[cfg(test)]
mod tests {
    use devo_protocol::CollaborationMode;
    use pretty_assertions::assert_eq;

    use super::*;

    #[test]
    fn build_mode_prompt_renders_all_mode_introductions() {
        assert_eq!(
            active_mode_prompt(CollaborationMode::Build),
            format!(
                "{}\n\n{}",
                include_str!("../prompts/collaboration-mode/build.md").trim_end(),
                include_str!("../prompts/collaboration-mode/plan.md").trim_end()
            )
        );

        let prompt = active_mode_prompt(CollaborationMode::Build);
        assert!(prompt.contains("<collaboration_mode_build>"));
        assert!(prompt.contains("<collaboration_mode_plan>"));
    }

    #[test]
    fn plan_mode_prompt_renders_all_mode_introductions() {
        assert_eq!(
            active_mode_prompt(CollaborationMode::Plan),
            format!(
                "{}\n\n{}",
                include_str!("../prompts/collaboration-mode/build.md").trim_end(),
                include_str!("../prompts/collaboration-mode/plan.md").trim_end()
            )
        );

        let prompt = active_mode_prompt(CollaborationMode::Plan);
        assert!(prompt.contains("<collaboration_mode_plan>"));
        assert!(prompt.contains("<collaboration_mode_build>"));
    }
}
