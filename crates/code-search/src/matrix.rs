use crate::types::CodeSearchError;

#[derive(Debug, Clone, PartialEq)]
pub struct EmbeddingMatrix {
    dimensions: usize,
    rows: Vec<f32>,
}

impl EmbeddingMatrix {
    pub fn empty() -> Self {
        Self {
            dimensions: 0,
            rows: Vec::new(),
        }
    }

    pub fn new(dimensions: usize, rows: Vec<f32>) -> Result<Self, CodeSearchError> {
        if dimensions == 0 {
            if rows.is_empty() {
                return Ok(Self::empty());
            }
            return Err(CodeSearchError::Index(
                "embedding dimensions must be non-zero when rows are present".to_string(),
            ));
        }
        if !rows.len().is_multiple_of(dimensions) {
            return Err(CodeSearchError::Index(format!(
                "embedding matrix has {} values, not divisible by {dimensions} dimensions",
                rows.len()
            )));
        }
        Ok(Self { dimensions, rows })
    }

    pub fn from_vectors(vectors: Vec<Vec<f32>>) -> Result<Self, CodeSearchError> {
        let Some(first) = vectors.first() else {
            return Ok(Self::empty());
        };
        let dimensions = first.len();
        if dimensions == 0 {
            return Err(CodeSearchError::Index(
                "embedding provider returned zero-dimensional vectors".to_string(),
            ));
        }
        let mut rows = Vec::with_capacity(vectors.len() * dimensions);
        for vector in vectors {
            if vector.len() != dimensions {
                return Err(CodeSearchError::Index(
                    "embedding provider returned vectors with inconsistent dimensions".to_string(),
                ));
            }
            rows.extend(vector);
        }
        Self::new(dimensions, rows)
    }

    pub fn dimensions(&self) -> usize {
        self.dimensions
    }

    pub fn row_count(&self) -> usize {
        if self.dimensions == 0 {
            0
        } else {
            self.rows.len() / self.dimensions
        }
    }

    pub fn row(&self, idx: usize) -> Option<&[f32]> {
        if idx >= self.row_count() {
            return None;
        }
        let start = idx * self.dimensions;
        let end = start + self.dimensions;
        Some(&self.rows[start..end])
    }

    pub fn rows(&self) -> &[f32] {
        &self.rows
    }

    pub fn append_row_slice(&mut self, row: &[f32]) -> Result<(), CodeSearchError> {
        if row.is_empty() {
            return Err(CodeSearchError::Index(
                "cannot append zero-dimensional embedding row".to_string(),
            ));
        }
        if self.dimensions == 0 {
            self.dimensions = row.len();
        } else if self.dimensions != row.len() {
            return Err(CodeSearchError::Index(format!(
                "embedding dimensions changed from {} to {}",
                self.dimensions,
                row.len()
            )));
        }
        self.rows.extend_from_slice(row);
        Ok(())
    }

    pub fn extend_rows_from(
        &mut self,
        other: &Self,
        start: usize,
        count: usize,
    ) -> Result<(), CodeSearchError> {
        for row_idx in start..start + count {
            let row = other.row(row_idx).ok_or_else(|| {
                CodeSearchError::Index(format!(
                    "cached embedding row {row_idx} is outside the matrix"
                ))
            })?;
            self.append_row_slice(row)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    /// Trace: L2-DES-TOOL-001
    /// Verifies: embedding matrices flatten vectors and expose stable row slices.
    #[test]
    fn matrix_flattens_vectors_to_row_major_storage() {
        let matrix =
            EmbeddingMatrix::from_vectors(vec![vec![1.0, 2.0], vec![3.0, 4.0]]).expect("matrix");

        assert_eq!(matrix.dimensions(), 2);
        assert_eq!(matrix.row_count(), 2);
        assert_eq!(matrix.row(1), Some([3.0, 4.0].as_slice()));
    }

    /// Trace: L2-DES-TOOL-001
    /// Verifies: inconsistent embedding dimensions are rejected before indexing.
    #[test]
    fn matrix_rejects_inconsistent_dimensions() {
        let matrix = EmbeddingMatrix::from_vectors(vec![vec![1.0], vec![2.0, 3.0]]);

        assert_eq!(matrix.is_err(), true);
    }
}
