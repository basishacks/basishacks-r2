ALTER TABLE teams ADD COLUMN pathway TEXT CHECK (pathway IN (NULL, 'junior', 'senior'));
