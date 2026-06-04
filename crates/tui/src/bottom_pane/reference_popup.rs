//! Combined `@` reference popup for composer-local fuzzy search.
//!
//! This widget owns the visual state for the token-local `@` search surface.
//! The composer supplies local skill and MCP metadata directly, while file
//! matches arrive asynchronously from the host-managed file-search session.

use std::path::PathBuf;

use crossterm::event::KeyCode;
use devo_file_search::FileMatch;
use devo_utils::fuzzy_match::fuzzy_match;
use ratatui::buffer::Buffer;
use ratatui::layout::Constraint;
use ratatui::layout::Layout;
use ratatui::layout::Rect;
use ratatui::style::Color;
use ratatui::text::Line;
use ratatui::widgets::Widget;
use ratatui::widgets::WidgetRef;

use crate::bottom_pane::McpServerMetadata;
use crate::key_hint;
use crate::render::Insets;
use crate::render::RectExt;
use crate::text_formatting::truncate_text;

use super::popup_consts::MAX_POPUP_ROWS;
use super::scroll_state::ScrollState;
use super::selection_popup_common::GenericDisplayRow;
use super::selection_popup_common::render_rows_single_line;
use super::skill_popup::MentionItem;

const REFERENCE_NAME_TRUNCATE_LEN: usize = 34;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum ReferenceSelection {
    Skill {
        insert_text: String,
        path: Option<String>,
    },
    Mcp {
        insert_text: String,
        path: String,
    },
    File {
        path: PathBuf,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ReferenceKind {
    Skill(usize),
    Mcp(usize),
    File(usize),
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct ReferenceMatch {
    kind: ReferenceKind,
    match_indices: Option<Vec<usize>>,
    score: i32,
}

pub(crate) struct ReferencePopup {
    query: String,
    skill_mentions: Vec<MentionItem>,
    mcp_servers: Vec<McpServerMetadata>,
    file_matches: Vec<FileMatch>,
    file_pending_query: String,
    file_waiting: bool,
    state: ScrollState,
    accent_color: Color,
}

impl ReferencePopup {
    pub(crate) fn new(
        skill_mentions: Vec<MentionItem>,
        mcp_servers: Vec<McpServerMetadata>,
        accent_color: Color,
    ) -> Self {
        Self {
            query: String::new(),
            skill_mentions,
            mcp_servers,
            file_matches: Vec::new(),
            file_pending_query: String::new(),
            file_waiting: false,
            state: ScrollState::new(),
            accent_color,
        }
    }

    pub(crate) fn set_sources(
        &mut self,
        skill_mentions: Vec<MentionItem>,
        mcp_servers: Vec<McpServerMetadata>,
    ) {
        self.skill_mentions = skill_mentions;
        self.mcp_servers = mcp_servers;
        self.clamp_selection();
    }

    pub(crate) fn set_query(&mut self, query: &str) {
        if self.query == query {
            return;
        }

        self.query = query.to_string();
        if query.trim().is_empty() {
            self.file_pending_query.clear();
            self.file_waiting = false;
            self.file_matches.clear();
        } else if self.file_pending_query != query {
            self.file_pending_query = query.to_string();
            self.file_waiting = true;
        }
        self.clamp_selection();
    }

    pub(crate) fn set_file_matches(&mut self, query: &str, matches: Vec<FileMatch>) {
        if query != self.file_pending_query {
            return;
        }

        self.file_matches = matches.into_iter().take(MAX_POPUP_ROWS).collect();
        self.file_waiting = false;
        self.clamp_selection();
    }

    pub(crate) fn calculate_required_height(&self, _width: u16) -> u16 {
        let rows = self.rows_from_matches(self.filtered());
        let visible = rows.len().clamp(1, MAX_POPUP_ROWS);
        (visible as u16).saturating_add(2)
    }

    pub(crate) fn move_up(&mut self) {
        let len = self.filtered().len();
        self.state.move_up_wrap(len);
        self.state.ensure_visible(len, MAX_POPUP_ROWS.min(len));
    }

    pub(crate) fn move_down(&mut self) {
        let len = self.filtered().len();
        self.state.move_down_wrap(len);
        self.state.ensure_visible(len, MAX_POPUP_ROWS.min(len));
    }

    pub(crate) fn selected_reference(&self) -> Option<ReferenceSelection> {
        let matches = self.filtered();
        let idx = self.state.selected_idx?;
        let selected = matches.get(idx)?;
        match selected.kind {
            ReferenceKind::Skill(skill_idx) => {
                let mention = self.skill_mentions.get(skill_idx)?;
                Some(ReferenceSelection::Skill {
                    insert_text: mention.insert_text.clone(),
                    path: mention.path.clone(),
                })
            }
            ReferenceKind::Mcp(server_idx) => {
                let server = self.mcp_servers.get(server_idx)?;
                Some(ReferenceSelection::Mcp {
                    insert_text: format!("@mcp:{}", server.id),
                    path: format!("mcp://server/{}", server.id),
                })
            }
            ReferenceKind::File(file_idx) => {
                let file_match = self.file_matches.get(file_idx)?;
                Some(ReferenceSelection::File {
                    path: file_match.path.clone(),
                })
            }
        }
    }

    fn clamp_selection(&mut self) {
        let len = self.filtered().len();
        self.state.clamp_selection(len);
        self.state.ensure_visible(len, MAX_POPUP_ROWS.min(len));
    }

    fn rows_from_matches(&self, matches: Vec<ReferenceMatch>) -> Vec<GenericDisplayRow> {
        matches
            .into_iter()
            .filter_map(|reference_match| match reference_match.kind {
                ReferenceKind::Skill(idx) => self.skill_mentions.get(idx).map(|mention| {
                    let name = truncate_text(&mention.display_name, REFERENCE_NAME_TRUNCATE_LEN);
                    GenericDisplayRow {
                        name,
                        name_prefix_spans: Vec::new(),
                        match_indices: reference_match.match_indices,
                        display_shortcut: None,
                        description: mention.description.clone(),
                        category_tag: Some("[Skill]".to_string()),
                        is_disabled: false,
                        disabled_reason: None,
                        wrap_indent: None,
                    }
                }),
                ReferenceKind::Mcp(idx) => self.mcp_servers.get(idx).map(|server| {
                    let name = truncate_text(&server.display_name, REFERENCE_NAME_TRUNCATE_LEN);
                    GenericDisplayRow {
                        name,
                        name_prefix_spans: Vec::new(),
                        match_indices: reference_match.match_indices,
                        display_shortcut: None,
                        description: Some(server.id.clone()),
                        category_tag: Some("[MCP]".to_string()),
                        is_disabled: !server.enabled,
                        disabled_reason: (!server.enabled).then(|| "disabled".to_string()),
                        wrap_indent: None,
                    }
                }),
                ReferenceKind::File(idx) => {
                    self.file_matches
                        .get(idx)
                        .map(|file_match| GenericDisplayRow {
                            name: file_match.path.to_string_lossy().to_string(),
                            name_prefix_spans: Vec::new(),
                            match_indices: file_match
                                .indices
                                .as_ref()
                                .map(|indices| indices.iter().map(|idx| *idx as usize).collect()),
                            display_shortcut: None,
                            description: None,
                            category_tag: Some("[File]".to_string()),
                            is_disabled: false,
                            disabled_reason: None,
                            wrap_indent: None,
                        })
                }
            })
            .collect()
    }

    fn filtered(&self) -> Vec<ReferenceMatch> {
        let filter = self.query.trim();
        let mut out = Vec::new();

        for (idx, mention) in self.skill_mentions.iter().enumerate() {
            if filter.is_empty() {
                out.push(ReferenceMatch {
                    kind: ReferenceKind::Skill(idx),
                    match_indices: None,
                    score: 0,
                });
                continue;
            }

            let best_match =
                if let Some((indices, score)) = fuzzy_match(&mention.display_name, filter) {
                    Some((Some(indices), score))
                } else {
                    mention
                        .search_terms
                        .iter()
                        .filter(|term| *term != &mention.display_name)
                        .filter_map(|term| fuzzy_match(term, filter).map(|(_indices, score)| score))
                        .min()
                        .map(|score| (None, score))
                };

            if let Some((match_indices, score)) = best_match {
                out.push(ReferenceMatch {
                    kind: ReferenceKind::Skill(idx),
                    match_indices,
                    score,
                });
            }
        }

        for (idx, server) in self.mcp_servers.iter().enumerate() {
            if filter.is_empty() {
                out.push(ReferenceMatch {
                    kind: ReferenceKind::Mcp(idx),
                    match_indices: None,
                    score: 0,
                });
                continue;
            }

            let best_match =
                if let Some((indices, score)) = fuzzy_match(&server.display_name, filter) {
                    Some((Some(indices), score))
                } else {
                    fuzzy_match(&server.id, filter).map(|(_indices, score)| (None, score))
                };

            if let Some((match_indices, score)) = best_match {
                out.push(ReferenceMatch {
                    kind: ReferenceKind::Mcp(idx),
                    match_indices,
                    score,
                });
            }
        }

        out.extend(
            self.file_matches
                .iter()
                .enumerate()
                .map(|(idx, file_match)| ReferenceMatch {
                    kind: ReferenceKind::File(idx),
                    match_indices: file_match
                        .indices
                        .as_ref()
                        .map(|indices| indices.iter().map(|idx| *idx as usize).collect()),
                    score: -(file_match.score as i32),
                }),
        );

        out.sort_by(|a, b| {
            reference_group_rank(a.kind)
                .cmp(&reference_group_rank(b.kind))
                .then_with(|| a.score.cmp(&b.score))
                .then_with(|| {
                    self.reference_name(a.kind)
                        .cmp(&self.reference_name(b.kind))
                })
        });

        out
    }

    fn reference_name(&self, kind: ReferenceKind) -> String {
        match kind {
            ReferenceKind::Skill(idx) => self
                .skill_mentions
                .get(idx)
                .map(|mention| mention.display_name.clone())
                .unwrap_or_default(),
            ReferenceKind::Mcp(idx) => self
                .mcp_servers
                .get(idx)
                .map(|server| server.display_name.clone())
                .unwrap_or_default(),
            ReferenceKind::File(idx) => self
                .file_matches
                .get(idx)
                .map(|file_match| file_match.path.to_string_lossy().into_owned())
                .unwrap_or_default(),
        }
    }
}

fn reference_group_rank(kind: ReferenceKind) -> u8 {
    match kind {
        ReferenceKind::Skill(_) => 0,
        ReferenceKind::Mcp(_) => 1,
        ReferenceKind::File(_) => 2,
    }
}

impl WidgetRef for ReferencePopup {
    fn render_ref(&self, area: Rect, buf: &mut Buffer) {
        let (list_area, hint_area) = if area.height > 2 {
            let [list_area, _spacer_area, hint_area] = Layout::vertical([
                Constraint::Length(area.height - 2),
                Constraint::Length(1),
                Constraint::Length(1),
            ])
            .areas(area);
            (list_area, Some(hint_area))
        } else {
            (area, None)
        };
        let rows = self.rows_from_matches(self.filtered());
        let empty_message = if self.file_waiting {
            "loading..."
        } else {
            "no matches"
        };
        render_rows_single_line(
            list_area.inset(Insets::tlbr(
                /*top*/ 0, /*left*/ 2, /*bottom*/ 0, /*right*/ 0,
            )),
            buf,
            &rows,
            &self.state,
            MAX_POPUP_ROWS,
            empty_message,
            self.accent_color,
        );
        if let Some(hint_area) = hint_area {
            let hint_area = Rect {
                x: hint_area.x + 2,
                y: hint_area.y,
                width: hint_area.width.saturating_sub(2),
                height: hint_area.height,
            };
            reference_popup_hint_line().render(hint_area, buf);
        }
    }
}

fn reference_popup_hint_line() -> Line<'static> {
    Line::from(vec![
        "Press ".into(),
        key_hint::plain(KeyCode::Enter).into(),
        " to insert or ".into(),
        key_hint::plain(KeyCode::Esc).into(),
        " to close".into(),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;
    use devo_file_search::MatchType;
    use pretty_assertions::assert_eq;

    fn skill(name: &str, rank: u8) -> MentionItem {
        MentionItem {
            display_name: name.to_string(),
            description: Some(format!("{name} skill")),
            insert_text: format!("${name}"),
            search_terms: vec![name.to_string()],
            path: Some(format!("skills/{name}/SKILL.md")),
            category_tag: Some("[Skill]".to_string()),
            sort_rank: rank,
        }
    }

    fn mcp(id: &str, display_name: &str) -> McpServerMetadata {
        McpServerMetadata {
            id: id.to_string(),
            display_name: display_name.to_string(),
            enabled: true,
        }
    }

    fn file(path: &str) -> FileMatch {
        FileMatch {
            score: 100,
            path: PathBuf::from(path),
            match_type: MatchType::File,
            root: PathBuf::from("."),
            indices: None,
        }
    }

    /// Trace: L2-DES-CLIENT-002
    /// Verifies: Empty query results keep skill, MCP, then file category ordering.
    #[test]
    fn empty_query_orders_skill_mcp_then_file() {
        let mut popup = ReferencePopup::new(
            vec![skill("openai-docs", 1)],
            vec![mcp("docs", "Docs")],
            Color::Cyan,
        );
        popup.set_query("");
        popup.set_file_matches("", vec![file("src/main.rs")]);

        let rows = popup.rows_from_matches(popup.filtered());

        assert_eq!(
            rows.into_iter()
                .map(|row| (row.name, row.category_tag))
                .collect::<Vec<_>>(),
            vec![
                ("openai-docs".to_string(), Some("[Skill]".to_string())),
                ("Docs".to_string(), Some("[MCP]".to_string())),
                ("src/main.rs".to_string(), Some("[File]".to_string())),
            ]
        );
    }

    /// Trace: L2-DES-CLIENT-002
    /// Verifies: Non-empty fuzzy queries filter skill, MCP, and file rows in category order.
    #[test]
    fn non_empty_query_filters_all_categories_in_order() {
        let mut popup = ReferencePopup::new(
            vec![skill("docs-skill", 1), skill("imagegen", 2)],
            vec![mcp("docs", "Docs")],
            Color::Cyan,
        );
        popup.set_query("docs");
        popup.set_file_matches("docs", vec![file("docs/tui-chat-composer.md")]);

        let rows = popup.rows_from_matches(popup.filtered());

        assert_eq!(
            rows.into_iter()
                .map(|row| (row.name, row.category_tag))
                .collect::<Vec<_>>(),
            vec![
                ("docs-skill".to_string(), Some("[Skill]".to_string())),
                ("Docs".to_string(), Some("[MCP]".to_string())),
                (
                    "docs/tui-chat-composer.md".to_string(),
                    Some("[File]".to_string()),
                ),
            ]
        );
    }

    /// Trace: L2-DES-CLIENT-002
    /// Verifies: MCP selections use a stable @mcp reference token and mention target.
    #[test]
    fn selected_mcp_reference_uses_stable_insert_token() {
        let mut popup = ReferencePopup::new(Vec::new(), vec![mcp("docs", "Docs")], Color::Cyan);
        popup.set_query("docs");

        assert_eq!(
            popup.selected_reference(),
            Some(ReferenceSelection::Mcp {
                insert_text: "@mcp:docs".to_string(),
                path: "mcp://server/docs".to_string(),
            })
        );
    }

    /// Trace: L2-DES-CLIENT-002
    /// Verifies: Stale file-search snapshots are rejected for the active reference popup.
    #[test]
    fn stale_file_results_are_ignored() {
        let mut popup = ReferencePopup::new(Vec::new(), Vec::new(), Color::Cyan);
        popup.set_query("new");
        popup.set_file_matches("old", vec![file("src/old.rs")]);

        assert_eq!(popup.rows_from_matches(popup.filtered()).len(), 0);
    }
}
