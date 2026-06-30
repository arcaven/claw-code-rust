use super::research_formatting::final_report_file_name;
use super::research_parsing::tool_content_to_json;
use super::*;

impl ServerRuntime {
    pub(super) async fn write_final_report_fallback(
        &self,
        session_id: SessionId,
        turn_id: TurnId,
        runtime: &ToolRuntime,
        question: &str,
        report_text: &str,
    ) -> anyhow::Result<String> {
        let tool_call_id = format!("final_report_write_{turn_id}");
        let file_path = final_report_file_name(question);
        let input = serde_json::json!({
            "filePath": file_path,
            "content": report_text,
        });
        let (item_id, item_seq) = self
            .start_item(
                session_id,
                turn_id,
                ItemKind::ToolCall,
                serde_json::to_value(ToolCallPayload {
                    tool_call_id: tool_call_id.clone(),
                    tool_name: "write".to_string(),
                    parameters: input.clone(),
                    command_actions: Vec::new(),
                })
                .expect("serialize fallback final report write tool call"),
            )
            .await;
        let call = ToolCall {
            id: tool_call_id.clone(),
            name: "write".to_string(),
            input: input.clone(),
        };
        let mut results = runtime.execute_batch(&[call]).await;
        let Some(result) = results.pop() else {
            anyhow::bail!("fallback final report write produced no tool result");
        };
        self.complete_item(
            session_id,
            turn_id,
            item_id,
            item_seq,
            ItemKind::ToolCall,
            TurnItem::ToolCall(ToolCallItem {
                tool_call_id: tool_call_id.clone(),
                tool_name: "write".to_string(),
                input: input.clone(),
            }),
            serde_json::to_value(ToolCallPayload {
                tool_call_id: tool_call_id.clone(),
                tool_name: "write".to_string(),
                parameters: input.clone(),
                command_actions: Vec::new(),
            })
            .expect("serialize completed fallback final report write tool call"),
        )
        .await;
        let output = tool_content_to_json(result.content.clone());
        let display_content = result.display_content.clone();
        let summary = display_content
            .clone()
            .unwrap_or_else(|| "write final report".to_string());
        self.emit_turn_item(
            session_id,
            turn_id,
            ItemKind::ToolResult,
            TurnItem::ToolResult(ToolResultItem {
                tool_call_id: tool_call_id.clone(),
                tool_name: Some("write".to_string()),
                output: output.clone(),
                display_content: display_content.clone(),
                is_error: result.is_error,
            }),
            serde_json::to_value(ToolResultPayload {
                tool_call_id,
                tool_name: Some("write".to_string()),
                input: Some(input.clone()),
                content: output.clone(),
                display_content,
                is_error: result.is_error,
                summary,
            })
            .expect("serialize fallback final report write tool result"),
        )
        .await;
        if result.is_error {
            anyhow::bail!(
                "fallback final report write failed: {}",
                result.content.into_string()
            );
        }
        extract_written_file_path(&input, &output)
            .or_else(|| {
                input
                    .get("filePath")
                    .and_then(serde_json::Value::as_str)
                    .map(str::to_string)
            })
            .ok_or_else(|| {
                anyhow::anyhow!("fallback final report write did not report a file path")
            })
    }
}
